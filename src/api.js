import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  timeout: 12000,
});

export const kitchenToken = () => sessionStorage.getItem("ayushKitchenToken") || "";

export const kitchenApi = () =>
  axios.create({
    baseURL: "/api",
    timeout: 12000,
    headers: { Authorization: `Bearer ${kitchenToken()}` },
  });
