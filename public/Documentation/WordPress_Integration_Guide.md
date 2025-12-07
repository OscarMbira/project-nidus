# WordPress Integration Guide - Project Nidus

**Date:** 2025-11-23  
**Purpose:** Guide for integrating Project Nidus React application with WordPress blog

---

## 📋 Overview

This guide explains how to integrate your React application (NidusHomepage, PMHomepage, SimulatorHomepage) with WordPress, allowing you to:
- Deploy the React app alongside WordPress
- Add blog posts in WordPress without recompiling React
- Maintain separation between blog and application homepages

---

## 🎯 Integration Strategies

### **Strategy 1: WordPress as Headless CMS (Recommended)**

**Best for:** Full control, dynamic blog content, no recompilation needed

#### How It Works:
1. WordPress runs as a backend CMS (headless)
2. React app fetches blog posts via WordPress REST API
3. Blog posts are added in WordPress admin
4. React app displays them dynamically

#### Implementation Steps:

**1. Enable WordPress REST API:**
```php
// In WordPress functions.php or a custom plugin
add_action('rest_api_init', function() {
    // Ensure REST API is enabled (usually enabled by default)
    // Add custom fields if needed
    register_rest_field('post', 'featured_image_url', array(
        'get_callback' => function($post) {
            return get_the_post_thumbnail_url($post['id'], 'large');
        }
    ));
});
```

**2. Create WordPress API Service in React:**
```javascript
// src/services/wordpressApi.js
const WORDPRESS_API_URL = process.env.VITE_WORDPRESS_API_URL || 'https://yourwordpress.com/wp-json/wp/v2';

export async function fetchBlogPosts(perPage = 10, page = 1) {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/posts?per_page=${perPage}&page=${page}&_embed=true`
    );
    if (!response.ok) throw new Error('Failed to fetch posts');
    const data = await response.json();
    
    return data.map(post => ({
      id: post.id,
      title: post.title.rendered,
      excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, ''), // Strip HTML
      date: new Date(post.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      category: post._embedded?.['wp:term']?.[0]?.[0]?.name || 'Uncategorized',
      slug: post.slug,
      featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
      link: post.link
    }));
  } catch (error) {
    console.error('Error fetching WordPress posts:', error);
    return [];
  }
}

export async function fetchSinglePost(slug) {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/posts?slug=${slug}&_embed=true`
    );
    if (!response.ok) throw new Error('Failed to fetch post');
    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error('Error fetching WordPress post:', error);
    return null;
  }
}
```

**3. Update NidusHomepage to Fetch from WordPress:**
```javascript
// In src/pages/NidusHomepage.jsx
import { useState, useEffect } from 'react';
import { fetchBlogPosts } from '../services/wordpressApi';

const NidusHomepage = () => {
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlogPosts();
  }, []);

  const loadBlogPosts = async () => {
    setLoading(true);
    const posts = await fetchBlogPosts(3); // Fetch 3 latest posts
    setBlogPosts(posts);
    setLoading(false);
  };

  // ... rest of component
};
```

**4. Environment Variables:**
```env
# .env
VITE_WORDPRESS_API_URL=https://yourwordpress.com/wp-json/wp/v2
```

**Advantages:**
- ✅ No recompilation needed when adding posts
- ✅ Full WordPress admin for content management
- ✅ SEO-friendly (can use WordPress SEO plugins)
- ✅ Dynamic content updates

**Disadvantages:**
- ⚠️ Requires WordPress installation
- ⚠️ API calls add slight latency
- ⚠️ Need to handle CORS if WordPress is on different domain

---

### **Strategy 2: WordPress Subdirectory with React Embed**

**Best for:** Existing WordPress site, want to embed React app

#### How It Works:
1. WordPress runs at root (`yourdomain.com`)
2. React app deployed to subdirectory (`yourdomain.com/app/`)
3. Blog posts in WordPress (`yourdomain.com/blog/`)
4. React app embedded via iframe or direct integration

#### Implementation Steps:

**1. Deploy React App to Subdirectory:**
```javascript
// vite.config.js
export default defineConfig({
  base: '/app/', // Important: Set base path
  // ... rest of config
})
```

**2. WordPress Page Template:**
```php
<?php
/*
Template Name: React App Embed
*/
?>
<!DOCTYPE html>
<html>
<head>
    <?php wp_head(); ?>
</head>
<body>
    <div id="react-app-root"></div>
    <script src="/app/assets/index.js"></script>
    <?php wp_footer(); ?>
</body>
</html>
```

**3. WordPress Menu Integration:**
- Create WordPress pages for `/pm` and `/simulator`
- Use page redirects or iframe embeds
- Or use JavaScript to load React routes

**Advantages:**
- ✅ Use existing WordPress installation
- ✅ WordPress handles blog posts natively
- ✅ Can use WordPress plugins

**Disadvantages:**
- ⚠️ More complex routing setup
- ⚠️ Potential iframe limitations
- ⚠️ SEO considerations for embedded content

---

### **Strategy 3: Separate Domains/Subdomains**

**Best for:** Complete separation, independent deployments

#### How It Works:
1. WordPress blog: `blog.projectnidus.com` or `projectnidus.com/blog`
2. React app: `app.projectnidus.com` or `projectnidus.com/app`
3. Cross-domain linking between them

#### Implementation Steps:

**1. WordPress Setup:**
- Install WordPress on subdomain or subdirectory
- Configure permalinks for blog posts
- Add navigation links to React app

**2. React App Setup:**
- Deploy to separate subdomain
- Add links to WordPress blog
- Use WordPress REST API for blog previews (optional)

**3. Cross-Domain Linking:**
```html
<!-- In WordPress -->
<a href="https://app.projectnidus.com/pm">Platform</a>
<a href="https://app.projectnidus.com/simulator">Simulator</a>

<!-- In React App -->
<a href="https://blog.projectnidus.com">Blog</a>
```

**Advantages:**
- ✅ Complete separation
- ✅ Independent deployments
- ✅ No conflicts between systems

**Disadvantages:**
- ⚠️ Requires multiple domains/subdomains
- ⚠️ More complex DNS setup
- ⚠️ Potential CORS issues if sharing data

---

### **Strategy 4: Static Site Generation with WordPress API**

**Best for:** Best performance, static hosting

#### How It Works:
1. Build React app as static site
2. Fetch WordPress posts at build time (or runtime)
3. Deploy static files to CDN
4. Use WordPress only for content management

#### Implementation Steps:

**1. Build Script with WordPress Fetch:**
```javascript
// scripts/build-with-blog.js
import { fetchBlogPosts } from './src/services/wordpressApi.js';
import fs from 'fs';

async function buildWithBlog() {
  // Fetch blog posts from WordPress
  const posts = await fetchBlogPosts(100);
  
  // Save to JSON file
  fs.writeFileSync(
    './public/blog-posts.json',
    JSON.stringify(posts, null, 2)
  );
  
  // Continue with normal build
  // ... vite build process
}
```

**2. Update NidusHomepage:**
```javascript
// Load from static JSON or fetch at runtime
const blogPosts = await import('../../public/blog-posts.json');
```

**Advantages:**
- ✅ Fast static site performance
- ✅ Can use free hosting (Netlify, Vercel)
- ✅ No WordPress server needed for visitors

**Disadvantages:**
- ⚠️ Requires rebuild to update blog posts (unless using runtime fetch)
- ⚠️ More complex build process

---

## 🚀 Recommended Approach: Strategy 1 (Headless WordPress)

For your use case, **Strategy 1 (WordPress as Headless CMS)** is recommended because:

1. ✅ **No Recompilation:** Blog posts added in WordPress appear immediately
2. ✅ **Familiar Interface:** Use WordPress admin you're already familiar with
3. ✅ **SEO Friendly:** WordPress handles SEO, React displays content
4. ✅ **Flexible:** Can add custom fields, categories, tags easily
5. ✅ **Scalable:** WordPress REST API is robust and well-documented

---

## 📝 Step-by-Step Implementation

### **Step 1: Set Up WordPress**

1. Install WordPress on your server/subdomain
2. Install and activate these plugins:
   - **REST API** (usually built-in)
   - **CORS Headers** (if React app is on different domain)
   - **Custom Post Types UI** (optional, for custom content types)

3. Configure permalinks:
   - Settings → Permalinks → Choose "Post name"

### **Step 2: Create WordPress API Service**

Create `src/services/wordpressApi.js` (see code above)

### **Step 3: Update NidusHomepage Component**

```javascript
// Replace static blogPosts array with:
const [blogPosts, setBlogPosts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadPosts = async () => {
    const posts = await fetchBlogPosts(3);
    setBlogPosts(posts);
    setLoading(false);
  };
  loadPosts();
}, []);
```

### **Step 4: Handle CORS (if needed)**

If WordPress and React are on different domains:

**WordPress Plugin:**
```php
// Add to functions.php or custom plugin
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: https://your-react-app.com');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        return $value;
    });
}, 15);
```

### **Step 5: Environment Configuration**

```env
# .env
VITE_WORDPRESS_API_URL=https://yourwordpress.com/wp-json/wp/v2
VITE_WORDPRESS_SITE_URL=https://yourwordpress.com
```

---

## 🔗 Linking Between WordPress and React

### **From WordPress to React:**

```html
<!-- In WordPress navigation or posts -->
<a href="https://your-react-app.com/pm">Platform</a>
<a href="https://your-react-app.com/simulator">Simulator</a>
```

### **From React to WordPress:**

```javascript
// In NidusHomepage.jsx
<a href={`${process.env.VITE_WORDPRESS_SITE_URL}/blog/${post.slug}`}>
  Read more →
</a>
```

---

## 📊 Blog Post Structure

### **WordPress Post Fields Used:**

- **Title:** `post.title.rendered`
- **Content:** `post.content.rendered`
- **Excerpt:** `post.excerpt.rendered`
- **Date:** `post.date`
- **Featured Image:** `post._embedded['wp:featuredmedia'][0].source_url`
- **Category:** `post._embedded['wp:term'][0][0].name`
- **Slug:** `post.slug`
- **Link:** `post.link`

### **Custom Fields (Optional):**

If you need custom fields:

```php
// In WordPress functions.php
add_action('rest_api_init', function() {
    register_rest_field('post', 'custom_category', array(
        'get_callback' => function($post) {
            return get_post_meta($post['id'], 'custom_category', true);
        }
    ));
});
```

---

## 🎨 Styling WordPress Content in React

When displaying WordPress content:

```javascript
// For HTML content from WordPress
<div 
  dangerouslySetInnerHTML={{ __html: post.content }} 
  className="prose prose-lg dark:prose-invert max-w-none"
/>
```

Use a library like `@tailwindcss/typography` for better styling:

```bash
npm install @tailwindcss/typography
```

```javascript
// tailwind.config.js
plugins: [
  require('@tailwindcss/typography'),
]
```

---

## 🔒 Security Considerations

1. **CORS Configuration:** Only allow your React app domain
2. **API Rate Limiting:** Implement rate limiting on WordPress API
3. **Authentication:** Use WordPress JWT for authenticated requests (if needed)
4. **HTTPS:** Always use HTTPS for both WordPress and React app

---

## 📱 Deployment Checklist

### **WordPress:**
- [ ] WordPress installed and configured
- [ ] REST API enabled and tested
- [ ] CORS configured (if needed)
- [ ] Permalinks configured
- [ ] Sample blog posts created

### **React App:**
- [ ] WordPress API service created
- [ ] Environment variables configured
- [ ] NidusHomepage updated to fetch from WordPress
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] CORS issues resolved

### **Integration:**
- [ ] Links between WordPress and React working
- [ ] Blog posts displaying correctly
- [ ] Images loading properly
- [ ] Mobile responsive
- [ ] SEO meta tags configured

---

## 🐛 Troubleshooting

### **CORS Errors:**
- Install CORS plugin in WordPress
- Or add CORS headers manually (see Step 4)

### **Posts Not Loading:**
- Check WordPress REST API is accessible: `yourwordpress.com/wp-json/wp/v2/posts`
- Verify environment variables are set correctly
- Check browser console for errors

### **Images Not Displaying:**
- Ensure `_embed=true` in API request
- Check featured image is set in WordPress
- Verify image URLs are absolute (not relative)

---

## 📚 Additional Resources

- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [React + WordPress Integration Examples](https://github.com/topics/wordpress-react)
- [Headless WordPress Guide](https://www.wpbeginner.com/glossary/headless-wordpress/)

---

## ✅ Summary

**Recommended Setup:**
1. Use **WordPress as Headless CMS** (Strategy 1)
2. React app fetches blog posts via REST API
3. Add posts in WordPress admin (no React recompilation needed)
4. Deploy React app separately (Vercel, Netlify, etc.)
5. Link between WordPress blog and React app

**Key Benefits:**
- ✅ No recompilation when adding blog posts
- ✅ Familiar WordPress admin interface
- ✅ SEO-friendly
- ✅ Scalable and maintainable

**Next Steps:**
1. Set up WordPress installation
2. Create WordPress API service in React
3. Update NidusHomepage to fetch from WordPress
4. Test integration
5. Deploy both systems

---

**Questions?** Refer to the troubleshooting section or check WordPress REST API documentation.

