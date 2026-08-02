import axios from "axios";

const api = axios.create({
  baseURL: "https://institute-api.rhaitech.online/arise/api" || "https://institute-api.rhaitech.online/arise/api", // backend url
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
