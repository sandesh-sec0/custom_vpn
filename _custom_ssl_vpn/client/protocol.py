"""
Client-specific protocol handling and message formatting.

Re-exports ``VPNMessage`` from the shared protocol layer for convenience.

.. note::
    This module is currently unused — all client modules import directly
    from ``_custom_ssl_vpn.shared.protocol``.  It is retained as a
    placeholder for future client-specific protocol extensions.
"""

from _custom_ssl_vpn.shared.protocol import VPNMessage

__all__ = [
    "ClientMessageHandler",
]


class ClientMessageHandler:
    """Placeholder for client-specific protocol extensions.

    Not currently used by any module.  All protocol encoding/decoding
    is handled directly via ``shared.protocol.encode_message`` and
    ``shared.protocol.decode_message``.
    """

    def __init__(self) -> None:
        """Initialise the client message handler instance."""
        pass

    def format_request(self, payload: bytes) -> VPNMessage:
        """Package application payload into a standard VPN message.

        Args:
            payload: The raw data to be sent across the tunnel.

        Returns:
            Application payload wrapped in protocol structure.

        Raises:
            NotImplementedError: This method is a placeholder.
        """
        raise NotImplementedError("Use shared.protocol.encode_message() instead.")
