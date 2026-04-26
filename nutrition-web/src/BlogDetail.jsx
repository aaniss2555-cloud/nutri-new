import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "./services/axiosInstance";

function BlogDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await api.get(`blog-posts/${id}/`);
        setPost(response.data);
      } catch (error) {
        console.error("Failed to load blog post", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  if (loading) {
    return <section className="blog-page"><p className="empty-state">Loading article...</p></section>;
  }

  if (!post) {
    return (
      <section className="blog-page">
        <p className="empty-state">Article not found.</p>
        <Link to="/blogs" className="inline-link">Back to blogs</Link>
      </section>
    );
  }

  return (
    <section className="blog-detail-page">
      <article className="blog-detail-shell">
        <Link to="/blogs" className="inline-link">Back to blogs</Link>
        {post.image_url && <img src={post.image_url} alt={post.title} className="blog-detail-image" />}
        <div className="blog-detail-meta">
          <span className="user-plan-badge">{post.category}</span>
          <small>{post.author_name} - {new Date(post.published_at).toLocaleDateString()}</small>
        </div>
        <h1>{post.title}</h1>
        {post.summary && <p className="blog-detail-summary">{post.summary}</p>}
        <div className="blog-detail-content">
          {post.content.split("\n").map((paragraph, index) => (
            paragraph.trim() ? <p key={index}>{paragraph}</p> : null
          ))}
        </div>
      </article>
    </section>
  );
}

export default BlogDetail;
