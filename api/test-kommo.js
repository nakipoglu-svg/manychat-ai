export default async function handler(req, res) {
  try {
    const T = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImMxNWFkZTM4NTAzMWJjMDJlMjc0NTFhODgyZGFlZmEwM2U0ZjNiMjJmZmM4NWJiMTZkZDZmNzBmY2NiY2M1MTVhNGI4ZTBmNTdhMzE4MjAwIn0.eyJhdWQiOiI1MTNiOWJmOC1lNzEwLTQzNzYtYmVlMS1kZGE2YThmNTI3YmIiLCJqdGkiOiJjMTVhZGUzODUwMzFiYzAyZTI3NDUxYTg4MmRhZWZhMDNlNGYzYjIyZmZjODViYjE2ZGQ2ZjcwZmNjYmNjNTE1YTRiOGUwZjU3YTMxODIwMCIsImlhdCI6MTc3NTU5NTQ3MSwibmJmIjoxNzc1NTk1NDcxLCJleHAiOjE3Nzc0MjA4MDAsInN1YiI6IjE1MDYyNjIzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM2Mjk5NjU1LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiZjU4NDYzMjAtN2QyZi00NmRmLTg3MjgtOGQ2MWFkMzEzYTYwIiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.RE5mRpGc_wyR0ixUDS5MEMwnqO3IIyg4XTaQd775gCabNlnc11V61w2Ol5unLr3HySbsRgFFlqjD3kS6JVKibMrUpCnaHyxAHhv1mzOnqC0N3dK_Jc1VLIy6iwj-hSO3JbgVNdTLxqJB2WjUI2-RDtzGIb_E4LfkQx_-auj-Fvr2lqwZZhG4ChtP1MmgWpZKlocXpvSxeEvjEzHuAyEQlKyF5hbXwRLlYGRIbV_9R_tGa-EjsoYyXkGYxCCXhMVnBF0c6t84iDHwpW4EviOANaBsV9fKXSrhqHsm8PeFpCrv5n96WamOuBg7potKLX5fH0u1JNcqBcNI9fvdf8_ATw";
    const r = await fetch("https://nakipoglu.kommo.com/api/v4/account", {
      headers: {"Authorization": "Bearer " + T, "Content-Type": "application/json"}
    });
    const t = await r.text();
    return res.status(200).json({status: r.status, body: t.slice(0, 500)});
  } catch(e) {
    return res.status(200).json({error: e.message});
  }
}
