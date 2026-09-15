import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  timeout: 20000,
});

export const kitchenToken = () => sessionStorage.getItem("ayushKitchenToken") || "";

export const kitchenApi = () =>
  axios.create({
    baseURL: "/api",
    timeout: 12000,
    headers: { Authorization: `Bearer ${kitchenToken()}` },
  });

export const agentApi = axios.create({
  baseURL: "/agent",
  timeout: 45000,
});

export const agentSessionId = () => {
  const key = "ayushAgentSession";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
};

export const newAgentSession = () => {
  const key = "ayushAgentSession";
  const id = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(key, id);
  return id;
};
