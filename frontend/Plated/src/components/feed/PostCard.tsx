import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { FeedPost } from '../../types';
import PostEngagement from './PostEngagement';
import CommentSection from './CommentSection';
import './PostCard.css';

interface PostCardProps {
  post: FeedPost;
}

function PostCard({ post }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);

  const handleDoubleClick = () => {
    if (!post.is_liked) {
      setLikeAnimation(true);
      setTimeout(() => setLikeAnimation(false), 1000);
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  return (
    <article className="post-card">
      {/* Post Header */}
      <div className="post-header">
        <div className="post-user-info">
          <img
            src={post.user.profile_pic || '/default-avatar.png'}
            alt={post.user.display_name}
            className="post-user-avatar"
          />
          <div>
            <div className="post-user-name">{post.user.display_name}</div>
            <div className="post-username">@{post.user.username}</div>
          </div>
        </div>
        <div className="post-timestamp">{formatTime(post.created_at)}</div>
      </div>

      {/* Post Title */}
      <h2 className="post-title">{post.title}</h2>

      {/* Post Media */}
      {post.media_url && (
        <div className="post-media" onDoubleClick={handleDoubleClick}>
          {post.media_type === 'video' ? (
            <video
              src={post.media_url}
              controls
              className="post-video"
              poster={post.media_url.replace(/\.[^.]+$/, '.jpg')}
            />
          ) : (
            <img src={post.media_url} alt={post.title} className="post-image" />
          )}
          {likeAnimation && (
            <div className="like-animation">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="like-heart-animated"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Post Description */}
      {post.description && <p className="post-description">{post.description}</p>}

      {/* Recipe Info */}
      {post.recipe_data && (
        <div className="post-recipe-info">
          <div className="recipe-meta">
            {post.recipe_data.cooking_time && (
              <span className="recipe-tag">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                {post.recipe_data.cooking_time} min
              </span>
            )}
            {post.recipe_data.difficulty && (
              <span className={`recipe-tag difficulty-${post.recipe_data.difficulty}`}>
                {post.recipe_data.difficulty}
              </span>
            )}
            {post.recipe_data.servings && (
              <span className="recipe-tag">Serves {post.recipe_data.servings}</span>
            )}
          </div>

          {/* Expandable Recipe Details */}
          {(post.recipe_data.ingredients || post.recipe_data.instructions) && (
            <button
              className="recipe-expand-btn"
              onClick={() => setShowRecipe(!showRecipe)}
            >
              {showRecipe ? 'Hide' : 'View'} Full Recipe
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={showRecipe ? 'rotated' : ''}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          )}

          {showRecipe && (
            <div className="recipe-details">
              {post.recipe_data.ingredients && post.recipe_data.ingredients.length > 0 && (
                <div className="recipe-section">
                  <h3>Ingredients</h3>
                  <ul className="ingredients-list">
                    {post.recipe_data.ingredients.map((ingredient, index) => (
                      <li key={index}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
              )}

              {post.recipe_data.instructions && post.recipe_data.instructions.length > 0 && (
                <div className="recipe-section">
                  <h3>Instructions</h3>
                  <ol className="instructions-list">
                    {post.recipe_data.instructions.map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Post Stats */}
      <div className="post-stats">
        <span>{post.likes_count.toLocaleString()} likes</span>
        <span>{post.views_count.toLocaleString()} views</span>
      </div>

      {/* Engagement Buttons */}
      <PostEngagement
        post={post}
        onCommentClick={() => setShowComments(!showComments)}
      />

      {/* Comments Section */}
      {showComments && <CommentSection postId={post.id} />}
    </article>
  );
}

export default PostCard;
