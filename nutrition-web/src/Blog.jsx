import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "./services/axiosInstance";

function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get("blog-posts/");
        setPosts(response.data);
      } catch (error) {
        console.error("Failed to load blog posts", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <section className="blog-page">
      <div className="blog-hero">
        <span className="eyebrow">Nutrition news</span>
        <h1>Learn, cook, and build better habits.</h1>
        <p>Educational posts, recipes, lifestyle tips, and platform announcements from the nutrition team.</p>
      </div>

      {loading ? (
        <p className="empty-state">Loading posts...</p>
      ) : posts.length === 0 ? (
        <p className="empty-state">No blog posts published yet.</p>
      ) : (
        <div className="blog-grid">
          {posts.map((post) => (
            <article key={post.id} className="blog-card">
              <Link to={`/blogs/${post.id}`} className="blog-card-link">
                {post.image_url && <img src={post.image_url} alt={post.title} className="blog-card-image" />}
                <span className="user-plan-badge">{post.category}</span>
                <h2>{post.title}</h2>
                <p>{post.summary || post.content.slice(0, 180)}</p>
                <small>{post.author_name} - {new Date(post.published_at).toLocaleDateString()}</small>
                <strong className="read-more-link">Read article</strong>
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default Blog;
