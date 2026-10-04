namespace Feedora.Application.Common;

public abstract class AppException(string message) : Exception(message);

public sealed class NotFoundException(string message) : AppException(message);

public sealed class ForbiddenException(string message = "You are not allowed to perform this action.")
    : AppException(message);

public sealed class UnauthorizedException(string message) : AppException(message);

/// <summary>Business-rule failure tied to specific fields; returned as a 400 validation problem.</summary>
public sealed class FieldErrorsException(IDictionary<string, string[]> errors)
    : AppException("One or more validation errors occurred.")
{
    public IDictionary<string, string[]> Errors { get; } = errors;
}
