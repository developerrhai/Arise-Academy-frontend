import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://15.207.105.160:5001/api", // backend url
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;