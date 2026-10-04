using BOF2.Application.Common;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace BOF2.Api.Infrastructure;

/// <summary>Maps application exceptions to RFC 7807 problem responses.</summary>
public class GlobalExceptionHandler(IProblemDetailsService problemDetails, ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        ProblemDetails problem = exception switch
        {
            ValidationException ve => new ValidationProblemDetails(
                ve.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).Distinct().ToArray()))
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "One or more validation errors occurred.",
            },
            FieldErrorsException fe => new ValidationProblemDetails(fe.Errors)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = fe.Message,
            },
            NotFoundException => new ProblemDetails { Status = StatusCodes.Status404NotFound, Title = exception.Message },
            ForbiddenException => new ProblemDetails { Status = StatusCodes.Status403Forbidden, Title = exception.Message },
            UnauthorizedException => new ProblemDetails { Status = StatusCodes.Status401Unauthorized, Title = exception.Message },
            _ => new ProblemDetails { Status = StatusCodes.Status500InternalServerError, Title = "Something went wrong." },
        };

        if (problem.Status == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception");

        context.Response.StatusCode = problem.Status!.Value;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problem,
            Exception = exception,
        });
    }
}
