import React from "react";

interface SEOMetaProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

const SEOMeta: React.FC<SEOMetaProps> = ({
  title = "OpenStay - Connect Travelers with Local Hosts for Authentic Experiences",
  description = "Host or travel with real people around the world. Join our verified community-based platform for authentic cultural exchanges and group travel experiences.",
  keywords = "community hosting, cultural exchange, travel groups, local hosts, verified hosting, authentic travel, budget travel, digital nomads, student groups, backpackers, group accommodation, cultural immersion, social travel, trust-based hosting, travel community, homestay alternative, couchsurfing alternative, group travel, verified hosts, travel experiences",
  ogTitle,
  ogDescription,
  ogImage = "/openstay-og-image.jpg",
  canonicalUrl = "https://openstay.in",
}) => {
  React.useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = description;
      document.head.appendChild(meta);
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute("content", keywords);
    } else {
      const meta = document.createElement("meta");
      meta.name = "keywords";
      meta.content = keywords;
      document.head.appendChild(meta);
    }

    // Add Open Graph meta tags
    const ogTags = [
      { property: "og:title", content: ogTitle || title },
      { property: "og:description", content: ogDescription || description },
      { property: "og:image", content: ogImage },
      { property: "og:url", content: canonicalUrl },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Openstay" },
    ];

    ogTags.forEach(({ property, content }) => {
      const existingTag = document.querySelector(
        `meta[property="${property}"]`
      );
      if (existingTag) {
        existingTag.setAttribute("content", content);
      } else {
        const meta = document.createElement("meta");
        meta.setAttribute("property", property);
        meta.setAttribute("content", content);
        document.head.appendChild(meta);
      }
    });

    // Add Twitter Card meta tags
    const twitterTags = [
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ogTitle || title },
      { name: "twitter:description", content: ogDescription || description },
      { name: "twitter:image", content: ogImage },
    ];

    twitterTags.forEach(({ name, content }) => {
      const existingTag = document.querySelector(`meta[name="${name}"]`);
      if (existingTag) {
        existingTag.setAttribute("content", content);
      } else {
        const meta = document.createElement("meta");
        meta.setAttribute("name", name);
        meta.setAttribute("content", content);
        document.head.appendChild(meta);
      }
    });

    // Add canonical URL
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute("href", canonicalUrl);
    } else {
      const link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      link.setAttribute("href", canonicalUrl);
      document.head.appendChild(link);
    }

    // Add structured data (JSON-LD)
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "OpenStay",
      url: canonicalUrl,
      description: description,
      logo: `${canonicalUrl}/logo.png`,
      contactPoint: {
        "@type": "ContactPoint",
        email: "sairampasupuleti.42@gmail.com",
        contactType: "Customer Service",
      },
      sameAs: [],
      services: [
        {
          "@type": "Service",
          name: "Community Hosting Platform",
          description:
            "Connect travelers with verified local hosts for authentic cultural experiences",
        },
        {
          "@type": "Service",
          name: "Group Travel Accommodation",
          description:
            "Specialized hosting for travel groups, students, and digital nomads",
        },
      ],
    };

    const existingStructuredData = document.querySelector(
      'script[type="application/ld+json"]'
    );
    if (existingStructuredData) {
      existingStructuredData.textContent = JSON.stringify(structuredData);
    } else {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    canonicalUrl,
  ]);

  return null; // This component doesn't render anything
};

export default SEOMeta;
