import api from "./axios";

export const fetchInterests = () => api.get("/interests");
export const fetchUserInterests = (userId) =>
    api.get(`/user-interests/${userId}`);

export const saveUserInterests = (userId, interests) =>
    api.post(`/user-interests/${userId}`, interests);
