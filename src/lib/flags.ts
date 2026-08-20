export const COUNTRIES: { code: string; name: string }[] = [
  { code: "SE", name: "Sverige" },
  { code: "US", name: "USA" },
  { code: "NO", name: "Norge" },
  { code: "DK", name: "Danmark" },
  { code: "FI", name: "Finland" },
  { code: "IS", name: "Island" },
  { code: "DE", name: "Tyskland" },
  { code: "AT", name: "Österrike" },
  { code: "CH", name: "Schweiz" },
  { code: "GB", name: "Storbritannien" },
  { code: "IE", name: "Irland" },
  { code: "NL", name: "Nederländerna" },
  { code: "BE", name: "Belgien" },
  { code: "FR", name: "Frankrike" },
  { code: "ES", name: "Spanien" },
  { code: "PT", name: "Portugal" },
  { code: "IT", name: "Italien" },
  { code: "PL", name: "Polen" },
  { code: "CZ", name: "Tjeckien" },
  { code: "HR", name: "Kroatien" },
  { code: "RS", name: "Serbien" },
  { code: "BA", name: "Bosnien och Hercegovina" },
  { code: "GR", name: "Grekland" },
  { code: "TR", name: "Turkiet" },
  { code: "UA", name: "Ukraina" },
  { code: "RU", name: "Ryssland" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Irak" },
  { code: "SY", name: "Syrien" },
  { code: "LB", name: "Libanon" },
  { code: "IL", name: "Israel" },
  { code: "MA", name: "Marocko" },
  { code: "DZ", name: "Algeriet" },
  { code: "TN", name: "Tunisien" },
  { code: "EG", name: "Egypten" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "SN", name: "Senegal" },
  { code: "CM", name: "Kamerun" },
  { code: "SO", name: "Somalia" },
  { code: "ET", name: "Etiopien" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "Sydafrika" },
  { code: "MX", name: "Mexiko" },
  { code: "CA", name: "Kanada" },
  { code: "BR", name: "Brasilien" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "UY", name: "Uruguay" },
  { code: "PE", name: "Peru" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "Sydkorea" },
  { code: "CN", name: "Kina" },
  { code: "IN", name: "Indien" },
  { code: "PH", name: "Filippinerna" },
  { code: "AU", name: "Australien" },
  { code: "NZ", name: "Nya Zeeland" },
];

export function flagEmoji(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0)),
  );
}

export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  return COUNTRIES.find((country) => country.code === code.toUpperCase())?.name ?? code;
}
