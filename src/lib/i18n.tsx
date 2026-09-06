import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "sv" | "en";

const STORAGE_KEY = "grf-lang";

const dict = {
  "nav.players": { sv: "Spelare", en: "Players" },
  "nav.clubs": { sv: "Klubbar", en: "Clubs" },
  "nav.myPage": { sv: "Min sida", en: "My page" },
  "nav.login": { sv: "Logga in", en: "Log in" },
  "lang.toggle": { sv: "English", en: "Svenska" },
  "lang.toggleTitle": { sv: "Byt till engelska", en: "Switch to Swedish" },

  "footer.text": {
    sv: "Gräsrot FC Data — spelar- och lagdatabas för gräsrotsfotboll i Sverige och USA. Byggd av och för ledare, scouter och föräldrar.",
    en: "Gräsrot FC Data — player and team database for grassroots football in Sweden and the USA. Built by and for coaches, scouts and parents.",
  },

  "home.kicker": {
    sv: "Division 5–7 · Ungdomsfotboll · Sunday League",
    en: "Division 5–7 · Youth soccer · Sunday League",
  },
  "home.title": {
    sv: "Varje spelare på gräsrotsnivå förtjänar en profil",
    en: "Every grassroots player deserves a profile",
  },
  "home.lead": {
    sv: "Gräsrot FC Data är en öppen spelar- och lagdatabas för fotboll under proffsnivån. Lägg in din klubb, dina lag och dina spelare — resten av communityn kan söka och följa dem.",
    en: "Gräsrot FC Data is an open player and team database for football below the pro level. Add your club, your teams and your players — the rest of the community can search and follow them.",
  },
  "home.ctaPlayers": { sv: "Sök spelare", en: "Search players" },
  "home.ctaClubs": { sv: "Bläddra klubbar", en: "Browse clubs" },
  "home.statPlayers": { sv: "Spelare", en: "Players" },
  "home.statClubs": { sv: "Klubbar", en: "Clubs" },
  "home.statTeams": { sv: "Lag", en: "Teams" },
  "home.latest": { sv: "Senast tillagda spelare", en: "Recently added players" },
  "home.empty": {
    sv: "Databasen är tom. Logga in och bli först med att registrera en klubb och dess spelare.",
    en: "The database is empty. Log in and be the first to register a club and its players.",
  },

  "players.title": { sv: "Spelare", en: "Players" },
  "players.searchPlaceholder": { sv: "Sök på namn…", en: "Search by name…" },
  "players.thPlayer": { sv: "Spelare", en: "Player" },
  "players.thPos": { sv: "Pos", en: "Pos" },
  "players.thBorn": { sv: "Född", en: "Born" },
  "players.thClub": { sv: "Klubb", en: "Club" },
  "players.thTeam": { sv: "Lag", en: "Team" },
  "players.noMatch": { sv: "Inga spelare matchar sökningen.", en: "No players match your search." },
  "players.noClub": { sv: "Klubblös", en: "No club" },

  "clubs.title": { sv: "Klubbar", en: "Clubs" },
  "clubs.searchPlaceholder": { sv: "Sök klubbnamn…", en: "Search club name…" },
  "clubs.noMatch": { sv: "Inga klubbar matchar sökningen.", en: "No clubs match your search." },
  "clubs.levelUnknown": { sv: "Nivå okänd", en: "Level unknown" },
  "clubs.teams": { sv: "lag", en: "teams" },
  "clubs.players": { sv: "spelare", en: "players" },

  "player.kicker": { sv: "Spelarprofil", en: "Player profile" },
  "player.edit": { sv: "Redigera", en: "Edit" },
  "player.about": { sv: "Om spelaren", en: "About the player" },
  "player.noBio": {
    sv: "Ingen beskrivning har lagts in för den här spelaren ännu.",
    en: "No description has been added for this player yet.",
  },
  "player.transfers": { sv: "Övergångar", en: "Transfers" },
  "player.noTransfers": {
    sv: "Inga övergångar är registrerade för den här spelaren ännu.",
    en: "No transfers have been recorded for this player yet.",
  },
  "player.clubTransfers": { sv: "Klubbövergångar", en: "Club transfers" },
  "player.schoolSpells": { sv: "Skolperioder", en: "School spells" },
  "player.nationalSpells": { sv: "Landslagsperioder", en: "National team spells" },
  "player.noClubTransfers": {
    sv: "Inga klubbövergångar är registrerade ännu.",
    en: "No club transfers have been recorded yet.",
  },
  "player.noSchoolSpells": {
    sv: "Inga skolperioder är registrerade ännu.",
    en: "No school spells have been recorded yet.",
  },
  "player.noNationalSpells": {
    sv: "Inga landslagsperioder är registrerade ännu.",
    en: "No national team spells have been recorded yet.",
  },
  "player.unknownClub": { sv: "Okänd klubb", en: "Unknown club" },
  "player.unknownDate": { sv: "Okänt datum", en: "Unknown date" },
  "player.facts": { sv: "Fakta", en: "Facts" },
  "player.position": { sv: "Position", en: "Position" },
  "player.birthYear": { sv: "Födelseår", en: "Birth year" },
  "player.birthplace": { sv: "Födelseort", en: "Place of birth" },
  "player.birthplaceCountry": { sv: "Födelseland", en: "Country of birth" },
  "player.foot": { sv: "Starkaste fot", en: "Preferred foot" },
  "player.height": { sv: "Längd", en: "Height" },
  "player.nationality": { sv: "Nationalitet", en: "Nationality" },
  "player.team": { sv: "Lag", en: "Team" },
  "player.ageGroup": { sv: "Åldersgrupp", en: "Age group" },
  "player.bornPrefix": { sv: "Född", en: "Born" },
  "player.notFound": { sv: "Spelaren finns inte", en: "Player not found" },
  "player.backToPlayers": { sv: "Tillbaka till spelare", en: "Back to players" },

  "club.kicker": { sv: "Klubb", en: "Club" },
  "club.founded": { sv: "Grundad", en: "Founded" },
  "club.edit": { sv: "Redigera klubb", en: "Edit club" },
  "club.teamsAndSquads": { sv: "Lag & trupper", en: "Teams & squads" },
  "club.noTeams": {
    sv: "Inga lag är registrerade för den här klubben ännu.",
    en: "No teams have been registered for this club yet.",
  },
  "club.otherPlayers": { sv: "Övriga spelare i klubben", en: "Other players in the club" },
  "club.emptySquad": { sv: "Truppen är tom.", en: "The squad is empty." },
  "club.notFound": { sv: "Klubben finns inte", en: "Club not found" },
  "club.backToClubs": { sv: "Tillbaka till klubbar", en: "Back to clubs" },
} satisfies Record<string, Record<Lang, string>>;

export type TranslationKey = keyof typeof dict;

type Ctx = { lang: Lang; setLang: (lang: Lang) => void; t: (key: TranslationKey) => string };

const LanguageContext = createContext<Ctx>({
  lang: "sv",
  setLang: () => {},
  t: (key) => dict[key].sv,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("sv");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "sv") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ lang, setLang, t: (key) => dict[key][lang] ?? dict[key].sv }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

const MONTHS: Record<Lang, string[]> = {
  sv: ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
};

export function formatDateInLang(date: string | null | undefined, lang: Lang, fallback: string) {
  if (!date) return fallback;
  const [year, month, day] = date.split("-");
  if (!year) return date;
  const monthName = month ? MONTHS[lang][Number(month) - 1] : undefined;
  if (!monthName) return year;
  const dayPart = day && day !== "01" ? Number(day) : undefined;
  if (!dayPart) return `${monthName} ${year}`;
  return lang === "en" ? `${monthName} ${dayPart}, ${year}` : `${dayPart} ${monthName} ${year}`;
}
