import { createContext, useContext, type ReactNode } from "react";

const dict = {
  "nav.players": "Players",
  "nav.clubs": "Clubs",
  "nav.matches": "Matches",
  "nav.statistics": "Statistics",
  "nav.myPage": "My page",
  "nav.login": "Log in",

  "footer.text":
    "Grassroots Football Hub — player and team database for grassroots football in Sweden and the USA. Built by and for coaches, scouts and parents.",

  "home.kicker": "Semi-Pro · Amateur · Youth Football · Sunday League",
  "home.title": "Every grassroots player deserves a profile",
  "home.lead":
    "Grassroots Football Hub is an open player and team database for football below the pro level. Add your club, your teams and your players — the rest of the community can search and follow them.",
  "home.ctaPlayers": "Search players",
  "home.ctaClubs": "Browse clubs",
  "home.statPlayers": "Players",
  "home.statClubs": "Clubs",
  "home.statTeams": "Teams",
  "home.latest": "Recently added players",
  "home.empty": "The database is empty. Log in and be the first to register a club and its players.",

  "players.title": "Players",
  "players.searchPlaceholder": "Search by name…",
  "players.thPlayer": "Player",
  "players.thPos": "Pos",
  "players.thBorn": "Born",
  "players.thClub": "Club",
  "players.thTeam": "Team",
  "players.noMatch": "No players match your search.",
  "players.noClub": "No club",

  "clubs.title": "Clubs",
  "clubs.searchPlaceholder": "Search club name…",
  "clubs.noMatch": "No clubs match your search.",
  "clubs.levelUnknown": "Level unknown",
  "clubs.teams": "teams",
  "clubs.players": "players",

  "player.kicker": "Player profile",
  "player.edit": "Edit",
  "player.about": "About the player",
  "player.noBio": "No description has been added for this player yet.",
  "player.transfers": "Transfers",
  "player.noTransfers": "No transfers have been recorded for this player yet.",
  "player.clubTransfers": "Club transfers",
  "player.schoolSpells": "School spells",
  "player.nationalSpells": "National team spells",
  "player.noClubTransfers": "No club transfers have been recorded yet.",
  "player.noSchoolSpells": "No school spells have been recorded yet.",
  "player.noNationalSpells": "No national team spells have been recorded yet.",
  "player.unknownClub": "Unknown club",
  "player.unknownDate": "Unknown date",
  "player.facts": "Facts",
  "player.position": "Position",
  "player.birthYear": "Birth year",
  "player.birthplace": "Place of birth",
  "player.birthplaceCountry": "Country of birth",
  "player.foot": "Preferred foot",
  "player.height": "Height",
  "player.nationality": "Nationality",
  "player.team": "Team",
  "player.ageGroup": "Age group",
  "player.bornPrefix": "Born",
  "player.notFound": "Player not found",
  "player.backToPlayers": "Back to players",

  "club.kicker": "Club",
  "club.founded": "Founded",
  "club.edit": "Edit club",
  "club.teamsAndSquads": "Teams & squads",
  "club.noTeams": "No teams have been registered for this club yet.",
  "club.otherPlayers": "Other players in the club",
  "club.emptySquad": "The squad is empty.",
  "club.notFound": "Club not found",
  "club.backToClubs": "Back to clubs",

  "matches.title": "Matches",
  "matches.noMatches": "No matches have been logged yet.",
  "stats.title": "Statistics",
  "matches.selectLeague": "Select a league",
  "matches.noLeagues": "No leagues yet — add a league to a team to see statistics.",
  "matches.standings": "Standings",
  "matches.topScorers": "Top scorers",
  "matches.topRatings": "Top average ratings",
  "matches.thTeam": "Team",
  "matches.thPlayed": "P",
  "matches.thWon": "W",
  "matches.thDrawn": "D",
  "matches.thLost": "L",
  "matches.thGF": "GF",
  "matches.thGA": "GA",
  "matches.thGD": "GD",
  "matches.thPts": "Pts",
  "matches.noStatsYet": "No results recorded for this league yet.",
  "matches.goals": "Goals",
  "matches.matchesPlayed": "Matches",
  "matches.rating": "Rating",
  "matches.notFound": "Match not found",
  "matches.backToMatches": "Back to matches",
  "matches.lineupRatings": "Player ratings",
  "matches.noRatingsYet": "No player ratings have been added for this match yet.",
  "matches.edit": "Edit match",
  "matches.notPlayedYet": "Not played yet",
} satisfies Record<string, string>;

export type TranslationKey = keyof typeof dict;

type Ctx = { t: (key: TranslationKey) => string };

const LanguageContext = createContext<Ctx>({ t: (key) => dict[key] });

export function LanguageProvider({ children }: { children: ReactNode }) {
  return <LanguageContext.Provider value={{ t: (key) => dict[key] }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDateInLang(date: string | null | undefined, fallback: string) {
  if (!date) return fallback;
  const [year, month, day] = date.split("-");
  if (!year) return date;
  const monthName = month ? MONTHS[Number(month) - 1] : undefined;
  if (!monthName) return year;
  const dayPart = day && day !== "01" ? Number(day) : undefined;
  if (!dayPart) return `${monthName} ${year}`;
  return `${monthName} ${dayPart}, ${year}`;
}
