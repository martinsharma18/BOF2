using BOF2.Api.Infrastructure;
using BOF2.Application.Vacancies;
using BOF2.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BOF2.Api.Controllers;

[ApiController]
[Route("api/vacancies")]
public class VacanciesController(IVacancyService vacancies) : ControllerBase
{
    /// <summary>Open vacancies posted by the super admin.</summary>
    [HttpGet]
    public Task<IReadOnlyList<VacancyDto>> GetOpen(int count = 5, CancellationToken ct = default) =>
        vacancies.GetOpenAsync(count, ct);

    /// <summary>Individual: apply with a CV. multipart/form-data: <c>cv</c> (photo or PDF) and an optional <c>note</c>.</summary>
    [HttpPost("{id:guid}/applications")]
    [Authorize(Roles = Roles.Individual)]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public Task<MyVacancyApplicationDto> Apply(Guid id, [FromForm] VacancyApplyRequest request, IFormFile? cv, CancellationToken ct) =>
        cv.WithUploadAsync(upload => vacancies.ApplyAsync(id, request, upload, ct));

    /// <summary>The signed-in user's application to this vacancy; 204 when they haven't applied.</summary>
    [HttpGet("{id:guid}/applications/mine")]
    [Authorize]
    public async Task<ActionResult<MyVacancyApplicationDto>> GetMine(Guid id, CancellationToken ct) =>
        await vacancies.GetMineAsync(id, ct) is { } mine ? mine : NoContent();
}
