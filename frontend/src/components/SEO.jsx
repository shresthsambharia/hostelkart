import { useEffect } from 'react';

const SEO = ({
  title,
  description,
  canonicalUrl,
  ogType = 'website',
  ogImage,
  schema,
}) => {
  useEffect(() => {
    const fullTitle = title 
      ? `${title} | HostelKart` 
      : 'HostelKart - Daily hostel essentials delivered to your room';
    document.title = fullTitle;

    const setMetaTag = (propertyOrName, content, isProperty = false) => {
      if (!content) return;
      const selector = isProperty 
        ? `meta[property="${propertyOrName}"]` 
        : `meta[name="${propertyOrName}"]`;
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        if (isProperty) {
          tag.setAttribute('property', propertyOrName);
        } else {
          tag.setAttribute('name', propertyOrName);
        }
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const setLinkTag = (rel, href) => {
      if (!href) return;
      let tag = document.querySelector(`link[rel="${rel}"]`);
      if (!tag) {
        tag = document.createElement('link');
        tag.setAttribute('rel', rel);
        document.head.appendChild(tag);
      }
      tag.setAttribute('href', href);
    };

    const defaultDesc = 'HostelKart is your go-to hostel delivery app, delivering daily essentials, fresh fruits, vegetables, stationery, and personal care directly to your hostel room in your selected time slot.';
    const activeDesc = description || defaultDesc;
    setMetaTag('description', activeDesc);

    const activeCanonical = canonicalUrl || window.location.href;
    setLinkTag('canonical', activeCanonical);

    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', activeDesc, true);
    setMetaTag('og:url', window.location.href, true);
    setMetaTag('og:type', ogType, true);
    if (ogImage) {
      setMetaTag('og:image', ogImage, true);
    }

    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', activeDesc);
    setMetaTag('twitter:url', window.location.href);
    if (ogImage) {
      setMetaTag('twitter:image', ogImage);
    }

    let scriptTag = document.querySelector('script[type="application/ld+json"]');
    if (schema) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      const cleanupScript = document.querySelector('script[type="application/ld+json"]');
      if (cleanupScript) {
        cleanupScript.remove();
      }
    };
  }, [title, description, canonicalUrl, ogType, ogImage, schema]);

  return null;
};

export default SEO;
