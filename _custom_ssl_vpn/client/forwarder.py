"""
Local port-to-VPN-tunnel traffic forwarding logic for the VPN client.

The ``LocalForwarder`` class listens on a local TCP port (e.g.
``127.0.0.1:9000``) and bridges traffic bidirectionally between:

* The local application socket
* The already-established TLS VPN socket provided by ``VPNClient``

The relay uses the same ``select.select`` / 1-second-timeout pattern as
``server/tunnel.py`` to stay responsive to ``stop()`` without busy-waiting.

**Persistent session support:**  When ``persistent=True``, the forwarder
re-enters the ``accept()`` loop after each application connection finishes
instead of tearing down the VPN tunnel.  This allows multiple sequential
browser sessions, ``curl`` requests, or database connections to reuse the
same authenticated VPN session.
"""

import socket
import select
import logging
import ssl
import struct
from typing import Optional

from _custom_ssl_vpn.shared.exceptions import ForwardingError
from _custom_ssl_vpn.shared.protocol import (
    Commands,
    VPNMessage,
    encode_message,
    decode_message
)

__all__ = [
    "LocalForwarder"
]


class LocalForwarder:
    """Bridges local application connections to the VPN tunnel socket.

    Lifecycle (persistent=False, original one-shot mode):

    1. ``start(vpn_socket)`` — binds the local port and blocks until one
       downstream client connects.
    2. After the downstream connection is accepted, the listening socket is
       immediately closed (only one client is supported).
    3. The ``_run_relay`` loop forwards bytes in both directions until either
       side closes.
    4. ``_cleanup`` closes the local socket.

    Lifecycle (persistent=True, multi-connection mode):

    1. ``start(vpn_socket)`` — binds the local port.
    2. Accepts a downstream client connection and relays data.
    3. When the application disconnects, the forwarder re-enters the
       ``accept()`` loop and waits for the next connection.
    4. Repeats until ``stop()`` is called or the VPN tunnel closes.

    The VPN socket is left open for ``VPNClient`` to manage in both modes.
    """

    def __init__(
        self,
        listen_host: str,
        listen_port: int,
        target_host: str,
        target_port: int,
        session_id: str,
        buffer_size: int,
        persistent: bool = False,
    ) -> None:
        """Initialise the forwarder with connection and buffer parameters.

        Args:
            listen_host: Interface to bind the local proxy port on.
                Should be ``"127.0.0.1"`` to restrict to the loopback
                interface and prevent external access to the proxy.
            listen_port: Port number on *listen_host* for applications to
                connect to.  Must be 1–65535.
            buffer_size: Number of bytes per ``recv`` call.  Matches
                ``ClientConfig.BUFFER_SIZE``.
            persistent: If ``True``, the forwarder re-enters accept after
                each connection instead of exiting.  Enables multiple
                sequential application connections over one VPN session.
        """
        self.listen_host = listen_host
        self.listen_port = listen_port
        self.target_host = target_host
        self.target_port = target_port
        self.session_id = session_id
        self.buffer_size = buffer_size
        self.persistent = persistent

        self._server_socket: Optional[socket.socket] = None
        self._local_socket: Optional[socket.socket] = None
        self._vpn_socket: Optional[ssl.SSLSocket] = None
        self._running = False
        self._logger = logging.getLogger("LocalForwarder")

        # Cumulative byte counters across all connections in this session
        self.total_bytes_up: int = 0
        self.total_bytes_down: int = 0
        self._connection_count: int = 0

    def start(self, vpn_socket: ssl.SSLSocket) -> None:
        """Bind to the local port, accept connections, and relay traffic.

        In one-shot mode (``persistent=False``), accepts exactly one connection
        and exits.  In persistent mode (``persistent=True``), loops accepting
        connections until ``stop()`` is called or the VPN tunnel drops.

        Args:
            vpn_socket: The live TLS socket connected to the VPN server,
                as returned by ``VPNClient.connect_to_server``.  Its
                lifecycle is managed by ``VPNClient``; ``LocalForwarder``
                reads from and writes to it but does not close it.

        Raises:
            ForwardingError: If the local socket cannot bind, or if the
                relay loop is interrupted by an unexpected exception.
        """
        self._vpn_socket = vpn_socket
        self._running = True

        try:
            self._server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            # Ensure the socket easily unbinds avoiding OS TIME_WAIT locks across client runs
            self._server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self._server_socket.bind((self.listen_host, self.listen_port))
            self._server_socket.listen(5)

            self._logger.info(f"Local proxy binding active on {self.listen_host}:{self.listen_port}")

            if self.persistent:
                print(f"VPN tunnel ready (persistent mode). Connect to: {self.listen_host}:{self.listen_port}")
                print(f"Multiple connections supported. Press Ctrl+C to disconnect.")
                self._accept_loop()
            else:
                print(f"VPN tunnel ready. Configure application proxy: {self.listen_host}:{self.listen_port} (Waiting for connection...)")
                self._accept_single()

        except OSError as e:
            raise ForwardingError("Failed to bind local listener or accept connection.", context={"error": str(e)})
        except ForwardingError:
            raise
        except Exception as e:
            raise ForwardingError("Unexpected relay crash.", context={"error": str(e)})
        finally:
            self._cleanup()

    def _accept_single(self) -> None:
        """Accept exactly one connection and relay it (original one-shot behaviour).

        After the single connection finishes, the forwarder exits and
        the VPN session is torn down by ``VPNClient``.
        """
        self._server_socket.settimeout(None)
        self._local_socket, addr = self._server_socket.accept()
        self._connection_count += 1
        self._logger.info(f"Local application connected from {addr}. Commencing data relay.")
        print(f"Application connected. Forwarding traffic securely.")

        # Close the listener — only one connection supported in one-shot mode
        self._server_socket = None

        self._open_remote_tunnel()
        self._run_relay(self._local_socket, self._vpn_socket)

    def _accept_loop(self) -> None:
        """Accept connections in a loop for persistent session mode.

        Each accepted connection is relayed until the application closes it,
        then the forwarder waits for the next connection.  The loop exits
        when ``stop()`` is called, the VPN tunnel drops, or an error occurs.
        """
        while self._running:
            try:
                # Use 1-second timeouts to check self._running periodically
                self._server_socket.settimeout(1.0)
                try:
                    self._local_socket, addr = self._server_socket.accept()
                except socket.timeout:
                    continue

                self._connection_count += 1
                self._logger.info(
                    f"[Connection #{self._connection_count}] Application connected from {addr}."
                )
                print(f"\n[Connection #{self._connection_count}] Application connected. Relaying...")

                self._open_remote_tunnel()
                self._run_relay(self._local_socket, self._vpn_socket)

                # Cleanup the application socket after relay ends
                self._close_local_socket()

                if not self._running:
                    break

                self._logger.info(f"[Connection #{self._connection_count}] Finished. Waiting for next connection...")
                print(f"[Connection #{self._connection_count}] Finished. Waiting for next connection on {self.listen_host}:{self.listen_port}...")

            except ForwardingError as e:
                # If the VPN tunnel itself broke, exit the loop
                self._logger.error(f"Relay error: {e}")
                break
            except OSError as e:
                if self._running:
                    self._logger.error(f"Accept loop error: {e}")
                break

    def _run_relay(self, local_sock: socket.socket, vpn_sock: ssl.SSLSocket) -> None:
        """Execute the bidirectional byte relay until either socket closes.

        Uses ``select.select`` with a 1-second timeout so the loop is
        interruptible when ``stop()`` sets ``_running = False``.

        In persistent mode, an empty read from the *local* application side
        ends the relay but does NOT set ``_running = False``, allowing the
        forwarder to accept the next connection.  An empty read from the
        *VPN* side always terminates the session.

        Args:
            local_sock: The downstream application socket.
            vpn_sock: The upstream VPN tunnel TLS socket.

        Raises:
            ForwardingError: If an unexpected exception interrupts the relay.
        """
        sockets = [local_sock, vpn_sock]
        bytes_up = 0
        bytes_down = 0
        relay_active = True

        try:
            while self._running and relay_active:
                readable, _, exceptional = select.select(sockets, [], sockets, 1.0)

                if exceptional:
                    self._logger.error("Relay socket exception encountered.")
                    break

                for s in readable:
                    if s is local_sock:
                        # Upload: Local App -> TLS Tunnel (Framed)
                        data = s.recv(self.buffer_size)
                        if not data:
                            self._logger.info("Local app closed connection. Signalling remote.")
                            # Optional: we could send a DISCONNECT or just rely on server 
                            # seeing no more DATA if we want to keep TLS alive.
                            # But we MUST tell the server this tunnel is done.
                            eof_msg = VPNMessage(command=Commands.DATA, payload=b"", session_id=self.session_id)
                            self._send_all(vpn_sock, encode_message(eof_msg))
                            
                            if self.persistent:
                                relay_active = False
                            else:
                                self._running = False
                            break
                        
                        # Wrap in DATA message
                        data_msg = VPNMessage(command=Commands.DATA, payload=data, session_id=self.session_id)
                        self._send_all(vpn_sock, encode_message(data_msg))
                        bytes_up += len(data)

                    elif s is vpn_sock:
                        # Download: TLS Tunnel -> Local App (Framed)
                        try:
                            # 1. Read message header (5 bytes: 4 length + 1 command)
                            header = self._recv_exactly(vpn_sock, 5)
                            if not header:
                                self._logger.info("VPN server closed transport connection.")
                                self._running = False
                                break
                            total_length, _ = struct.unpack("!I B", header)
                            
                            # 2. Read rest
                            rest_data = self._recv_exactly(vpn_sock, total_length - 5)
                            if not rest_data:
                                self._running = False
                                break
                                
                            msg = decode_message(header + rest_data)
                            
                            if msg.command == Commands.DATA:
                                if not msg.payload:
                                    # Remote EOF signal
                                    self._logger.info("Remote target closed (EOF signal).")
                                    relay_active = False
                                    break
                                
                                self._send_all(local_sock, msg.payload)
                                bytes_down += len(msg.payload)
                            elif msg.command == Commands.ERROR:
                                self._logger.error(f"Remote error during relay: {msg.payload.decode()}")
                                relay_active = False
                                break
                        except Exception as e:
                            self._logger.error(f"Relay Protocol Error: {e}")
                            self._running = False
                            break

        except Exception as e:
            raise ForwardingError("Bidirectional pipe broken.", context={"error": str(e)})
        finally:
            self.total_bytes_up += bytes_up
            self.total_bytes_down += bytes_down
            self._logger.info(f"Relay closed. Sent {bytes_up} bytes upstream, received {bytes_down} bytes downstream.")
            if not self.persistent:
                print(f"\nConnection closed safely. Bytes Uploaded: {bytes_up} | Downloaded: {bytes_down}")
            else:
                print(f"  ↳ Transferred: ↑{bytes_up}B  ↓{bytes_down}B  (Total: ↑{self.total_bytes_up}B  ↓{self.total_bytes_down}B)")

    def _send_all(self, sock: socket.socket, data: bytes) -> None:
        """Send the full *data* buffer to *sock*, looping on partial writes.

        Args:
            sock: Destination socket (plain or TLS).
            data: Complete byte payload to transmit.
        """
        total_sent = 0
        while total_sent < len(data):
            sent = sock.send(data[total_sent:])
            if sent == 0:
                raise ForwardingError("Network connection severed during active send.")
            total_sent += sent

    def _recv_exactly(self, sock: socket.socket, n: int) -> Optional[bytes]:
        """Read exactly *n* bytes from *sock*, blocking as needed.

        Args:
            sock: Source socket.
            n: Number of bytes to read.

        Returns:
            The *n*-byte buffer, or ``None`` if the connection is closed
            before *n* bytes are received.
        """
        data = b""
        while len(data) < n:
            try:
                packet = sock.recv(n - len(data))
                if not packet:
                    return None
                data += packet
            except (socket.timeout, ssl.SSLError):
                continue
        return data

    def stop(self) -> None:
        """Signal the relay loop to exit within one ``select`` timeout cycle.

        Thread-safe: may be called from a signal handler or a separate thread.
        Does not forcibly close sockets; ``_cleanup`` handles that in the
        ``finally`` block of ``start``.
        """
        self._running = False

    def _open_remote_tunnel(self) -> None:
        """Negotiate the CONNECT state in the active TLS pipeline."""
        import json
        connect_payload = json.dumps(
            {"host": self.target_host, "port": self.target_port}
        ).encode("utf-8")

        connect_msg = VPNMessage(
            command=Commands.CONNECT, payload=connect_payload, session_id=self.session_id
        )

        self._vpn_socket.sendall(encode_message(connect_msg))
        buffer = self._vpn_socket.recv(self.buffer_size)
        if not buffer:
            raise ForwardingError("Server disconnected while building tunnel.")

        response = decode_message(buffer)
        if response.command != Commands.OK:
            reason = response.payload.decode("utf-8", errors="ignore")
            raise ForwardingError(f"Server rejected proxy request: {reason}")

        self._logger.info(f"Server OK. Upstream target connected: {self.target_host}:{self.target_port}")

    def _close_local_socket(self) -> None:
        """Close the current local application socket between connections.

        Called in persistent mode after each relay finishes to release the
        application socket before re-entering accept.
        """
        if self._local_socket:
            try:
                self._local_socket.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            try:
                self._local_socket.close()
            except OSError:
                pass
            self._local_socket = None

    def _cleanup(self) -> None:
        """Release the local application socket and the listener socket.

        The VPN socket lifecycle belongs to ``VPNClient`` — it is not touched
        here.  Called automatically from the ``finally`` block of ``start``.
        """
        self._running = False

        self._close_local_socket()

        # Close the proxy listener
        if self._server_socket:
            try:
                self._server_socket.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            try:
                self._server_socket.close()
            except OSError:
                pass
            self._server_socket = None

        if self.persistent and self._connection_count > 0:
            print(f"\nSession ended. Total connections: {self._connection_count} | Total: ↑{self.total_bytes_up}B  ↓{self.total_bytes_down}B")
