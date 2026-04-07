// /api/test-kommo.js — Vercel'den Kommo API erişim testi

const KOMMO_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjM2YTAyNGU4MjkzMDI3YWM3NDgxNDRiM2JlZGEzZGY3NWRkODI2MGJjODJjNTU5ZTQzMDliZDRmN2FmOTQxOWRmMGQ0MDQwMmE5ZWMzYTkwIn0.eyJhdWQiOiI1MTNiOWJmOC1lNzEwLTQzNzYtYmVlMS1kZGE2YThmNTI3YmIiLCJqdGkiOiIzNmEwMjRlODI5MzAyN2FjNzQ4MTQ0YjNiZWRhM2RmNzVkZDgyNjBiYzgyYzU1OWU0MzA5YmQ0ZjdhZjk0MTlkZjBkNDA0MDJhOWVjM2E5MCIsImlhdCI6MTc3NTU4MjQ4NywibmJmIjoxNzc1NTgyNDg3LCJleHAiOjE3Nzc1MDcyMDAsInN1YiI6IjE1MDYyNjIzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM2Mjk5NjU1LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiYmNlYTZkM2ItMmZkMC00YjI2LWEwMmUtZjUzZmM0N2U1ZWJjIiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.NvHomqkguoAWd-jjA6fiem2eSk2-40hPy-kYy8THeUMH5VQEY93nYJzwm4SZ5un5C9Bzmzg92rVwzm-rCELv__blAZz2nP842vCaPjh7DgMM9naYzr7A1Ep7dmZ850AUTmXQDbl03wplRYbU-v2Dn0L2uK756odeLyE0Qsgd88sUQLvdWGcKZYUpjRBf7VJpeBUANkEnzNjgzOSo616PbgMQonnNiOHNwJtkwDCnNHDCJ0M4u1eJiqut0_BUV9p2dM2aJK13sYtUNQ2kTKv9noI3cgEi9XYxE1-tyH8azJuYeC3XV7hWLfnTV5JsW8xPQN9YZEtdkaAQNQhkBMvpJA";

export default async function handler(req, res) {
  try {
    console.log("[TEST] Kommo API'ye bağlanılıyor...");
    
    const response = await fetch("https://api-c.kommo.com/api/v4/account", {
      headers: {
        "Authorization": `Bearer ${KOMMO_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const status = response.status;
    const text = await response.text();

    console.log("[TEST] Status:", status);
    console.log("[TEST] Response:", text.slice(0, 300));

    return res.status(200).json({
      kommo_status: status,
      kommo_response: text.slice(0, 500),
      vercel_can_reach_kommo: status === 200,
    });
  } catch (error) {
    console.error("[TEST] Hata:", error.message);
    return res.status(200).json({
      error: error.message,
      vercel_can_reach_kommo: false,
    });
  }
}
