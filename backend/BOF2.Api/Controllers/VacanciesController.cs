using Feedora.Application.Vacancies;
using Microsoft.AspNetCore.Mvc;

namespace Feedora.Api.Controllers;

[ApiController]
[Route("api/vacancies")]
public class VacanciesController(IVacancyService vacancies) : ControllerBase
{
    /// <summary>Open vacancies posted by the super admin.</summary>
    [HttpGet]
    public Task<IReadOnlyList<VacancyDto>> GetOpen(int count = 5, CancellationToken ct = default) =>
        vacancies.GetOpenAsync(count, ct);
}
