const PASSWORD_SPECIAL_CHARACTERS = "!@#$%^&*()_+-=[]{};':\"|<>?,./\\`~";

export function getPasswordError(password) {
  if (!/^[A-Z]/.test(password)) return 'Password must start with an uppercase letter.';
  if (password.length < 6) return 'Password must be at least 6 characters long.';
  if (!/\d/.test(password)) return 'Password must contain at least one number.';
  if (![...PASSWORD_SPECIAL_CHARACTERS].some((character) => password.includes(character))) {
    return 'Password must contain at least one special character.';
  }
  if (/(.)\1{3}/.test(password)) return 'Password cannot repeat the same character more than 3 times in a row.';
  return '';
}
