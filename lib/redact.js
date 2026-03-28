export function maskPhone(text = "") {
  return String(text).replace(
    /(?:\+?90[\s().-]*)?(?:0?5\d(?:[\s().-]*\d){8})/g,
    "[PHONE]"
  );
}

export function maskAddress(text = "") {
  let out = String(text);

  out = out.replace(
    /\b(mahalle|mah|sokak|sk|cadde|cd|bulvar|no|daire|apt|apartman|kat|blok|site|sitesi)\b.*$/i,
    "[ADDRESS]"
  );

  return out;
}

export function redactText(text = "") {
  return maskAddress(maskPhone(text));
}
