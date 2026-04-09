// smalltalk.js — Selamlama, teşekkür, dua, beğeni
import { INTENT, REPLY_CLASS } from "../constants.js";
import { hasAny } from "../normalize.js";

const R = (t) => ({ text: t, reply_class: REPLY_CLASS.FIXED_INFO, support_mode_reason: "" });

export function smalltalkRule(ctx) {
  if (ctx.intent !== INTENT.SMALLTALK) return null;
  const { norm } = ctx;

  if (hasAny(norm, ["basiniz sagolsun","basiniz sag olsun","hakkinizi helal","allah yardimciniz"])) return R("Çok teşekkür ederiz efendim 😊");
  if (hasAny(norm, ["allah razi olsun","allah razı olsun"])) return R("Cümlemizden inşallah, çok teşekkür ederiz efendim 😊");
  if (hasAny(norm, ["insallah","inşallah","amin","masallah","eyvallah","hayirli isler","bol kazanclar"])) return R("Amin, çok teşekkür ederiz efendim 😊");
  if (hasAny(norm, ["tesekkur","teşekkür","tesekur","teşekür","sagolun","sağolun","saol","tsk","tşk","rica ederim"])) return R("Rica ederiz efendim 😊");
  if (hasAny(norm, ["gecmis olsun","geçmiş olsun"])) return R("Çok teşekkür ederiz efendim 😊");
  if (hasAny(norm, ["kolay gelsin"])) return R("Teşekkür ederiz efendim 😊");
  if (hasAny(norm, ["begendim","beğendim","begendik","beğendik","guzel","güzel","super","süper","harika","saglik","sağlık"])) return R("Çok teşekkür ederiz efendim 😊");
  if (hasAny(norm, ["merhaba","selam","slm","mrb","merhabalar"])) return R("Merhaba, hoş geldiniz 😊");
  if (hasAny(norm, ["nasilsiniz","iyi misiniz","iyimisiniz","nasilsin","naber"])) return R("İyiyiz efendim, teşekkür ederiz 😊 Size nasıl yardımcı olabiliriz?");
  return R("Tabi efendim 😊");
}
