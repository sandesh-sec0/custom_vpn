"""
Server-specific protocol message parsing and handling.

Re-exports ``VPNMessage`` from the shared protocol layer for convenience.

.. note::
    This module is currently unused — all server modules import directly
    from ``_custom_ssl_vpn.shared.protocol``.  It is retained as a
    placeholder for future server-specific protocol extensions.
"""

from _custom_ssl_vpn.shared.protocol import VPNMessage

__all__ = [
    "ServerMessageHandler",
]


class ServerMessageHandler:
    """Placeholder for server-specific protocol extensions.

    Not currently used by any module.  All protocol encoding/decoding
    is handled directly via ``shared.protocol.encode_message`` and
    ``shared.protocol.decode_message``.
    """

    def __init__(self) -> None:
        """Initialise the server message handler instance."""
        pass

    def process_incoming(self, raw_data: bytes) -> VPNMessage:
        """Convert a raw byte stream from the client into a structured VPN message.

        Args:
            raw_data: The bytes received over the wire.

        Returns:
            The structured VPNMessage representation.

        Raises:
            NotImplementedError: This method is a placeholder.
        """
        raise NotImplementedError("Use shared.protocol.decode_message() instead.")
