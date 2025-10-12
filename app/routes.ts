import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("festivals", "routes/festivals.tsx"),
    route("calendar", "routes/overview.tsx")
] satisfies RouteConfig;

