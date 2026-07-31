import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://institute-api.rhaitech.online/arise/api", // backend url
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
