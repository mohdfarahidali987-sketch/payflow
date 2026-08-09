import axios from "axios";
export const api=axios.create({
    baseURL:import.meta.env.VITE_BACKEND_URL,
    headers:{
        Authorization: "Bearer "+localStorage.getItem("token")
    }

});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});
api.interceptors.response.use(
    (response) => {
        return response;
    },

    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");

            window.location.href = "/signin";
        }

        return Promise.reject(error);
    }
);