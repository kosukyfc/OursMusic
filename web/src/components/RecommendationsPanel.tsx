import { useState, useEffect } from 'react';
import { Recommendation } from '../types/recommendations';

/**
 * Recommendations Component
 * Displays personalized music recommendations for the user
 */
export const RecommendationsPanel = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/recommendations', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch recommendations');

      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="recommendations-loading">Loading recommendations...</div>;
  }

  if (error) {
    return <div className="recommendations-error">Error: {error}</div>;
  }

  return (
    <div className="recommendations-panel">
      <h2>Recommended For You</h2>
      <div className="recommendations-grid">
        {recommendations.map((rec) => (
          <div key={rec.id} className="recommendation-card">
            <div className="similarity-badge">{Math.round(rec.similarity * 100)}% Match</div>
            <h3>{rec.title}</h3>
            <p className="artist">{rec.artist}</p>
            <p className="genre">{rec.genre}</p>
            <p className="reason">{rec.reason}</p>
            <button className="play-btn">Play Now</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationsPanel;
