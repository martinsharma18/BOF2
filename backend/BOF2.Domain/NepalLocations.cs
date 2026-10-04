namespace BOF2.Domain;

/// <summary>Nepal's 7 provinces and 77 districts, used for the Province / District dropdowns.</summary>
public static class NepalLocations
{
    public static readonly IReadOnlyDictionary<string, string[]> Provinces = new Dictionary<string, string[]>
    {
        ["Koshi"] =
        [
            "Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga",
            "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur"
        ],
        ["Madhesh"] = ["Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi", "Siraha"],
        ["Bagmati"] =
        [
            "Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok", "Lalitpur",
            "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok"
        ],
        ["Gandaki"] =
        [
            "Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi",
            "Nawalpur", "Parbat", "Syangja", "Tanahun"
        ],
        ["Lumbini"] =
        [
            "Arghakhanchi", "Banke", "Bardiya", "Dang", "Eastern Rukum", "Gulmi", "Kapilvastu",
            "Parasi", "Palpa", "Pyuthan", "Rolpa", "Rupandehi"
        ],
        ["Karnali"] =
        [
            "Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu", "Salyan", "Surkhet", "Western Rukum"
        ],
        ["Sudurpashchim"] =
        [
            "Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula", "Doti", "Kailali", "Kanchanpur"
        ]
    };

    public static bool IsValid(string? province, string? district) =>
        province is not null && district is not null &&
        Provinces.TryGetValue(province, out var districts) && districts.Contains(district);
}
