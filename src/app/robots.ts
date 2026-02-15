import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin/", "/login", "/signup"],
      },
    ],
    sitemap: "https://www.letsmeet.link/sitemap.xml",
  };
}
