"""
Custom exception classes for the backend.

Used for domain-level errors that are converted to HTTP responses.
"""


class APIException(Exception):
    """Base exception for all API errors."""

    def __init__(self, message: str, status_code: int = 500):
        """
        Initialize exception.

        Args:
            message: Error message
            status_code: HTTP status code
        """
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AuthenticationError(APIException):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class UnauthorizedError(APIException):
    """Raised when user lacks required permissions."""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=403)


class NotFoundError(APIException):
    """Raised when requested resource does not exist."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class ValidationError(APIException):
    """Raised when input validation fails."""

    def __init__(self, message: str = "Invalid input"):
        super().__init__(message, status_code=422)


class ConflictError(APIException):
    """Raised when creating duplicate resource."""

    def __init__(self, message: str = "Conflict"):
        super().__init__(message, status_code=409)


class RateLimitError(APIException):
    """Raised when rate limit is exceeded."""

    def __init__(self, message: str = "Too many requests"):
        super().__init__(message, status_code=429)
