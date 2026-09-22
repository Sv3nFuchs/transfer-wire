/** Age in whole years on `atDate`, given a "YYYY-MM-DD" `birthDate`. */
export function calculateAge(birthDate: string, atDate: string): number | null {
  const birth = new Date(birthDate);
  const at = new Date(atDate);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(at.getTime())) return null;
  let age = at.getFullYear() - birth.getFullYear();
  const hadBirthdayByAtDate =
    at.getMonth() > birth.getMonth() || (at.getMonth() === birth.getMonth() && at.getDate() >= birth.getDate());
  if (!hadBirthdayByAtDate) age -= 1;
  return age;
}

/** True if `birthDate`'s month/day matches today's, in the viewer's local time zone. */
export function isBirthdayToday(birthDate: string): boolean {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  return birth.getUTCMonth() === today.getMonth() && birth.getUTCDate() === today.getDate();
}
