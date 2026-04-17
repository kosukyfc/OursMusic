import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ListeningStats {
  totalListens: number;
  totalMinutes: number;
  uniqueArtists: number;
  uniqueSongs: number;
  topGenres: Array<{ genre: string; count: number }>;
  topArtists: Array<{ artist: string; count: number }>;
  listeningByDay: Array<{ day: string; listens: number }>;
  energyDistribution: Array<{ energy: string; count: number }>;
  moodTrends: Array<{ week: number; mood: string; score: number }>;
  predictionNextQuarter: {
    topGenres: string[];
    topArtists: string[];
    likelyMood: string;
  };
  tasteEvolution: Array<{
    date: string;
    genreDistribution: Record<string, number>;
    averageEnergy: number;
  }>;
}

export const PersonalStatsV2: React.FC = () => {
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'predictions' | 'evolution'>('overview');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [decayFactor, setDecayFactor] = useState(0.5); // Recent = more weighted

  useEffect(() => {
    fetchStats();
  }, [timeframe, decayFactor]);

  const fetchStats = async () => {
    // TODO: Call backend /stats endpoint with timeframe & decay factor
    const mockStats: ListeningStats = {
      totalListens: 4523,
      totalMinutes: 28460,
      uniqueArtists: 247,
      uniqueSongs: 1089,
      topGenres: [
        { genre: 'Rock', count: 812 },
        { genre: 'Indie', count: 654 },
        { genre: 'Electronic', count: 543 },
        { genre: 'Pop', count: 421 },
        { genre: 'Hip-Hop', count: 370 },
      ],
      topArtists: [
        { artist: 'The Weeknd', count: 187 },
        { artist: 'Donda West', count: 154 },
        { artist: 'Arctic Monkeys', count: 142 },
        { artist: 'Tyler, The Creator', count: 138 },
        { artist: 'Frank Ocean', count: 121 },
      ],
      listeningByDay: Array.from({ length: 7 }, (_, i) => ({
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        listens: Math.floor(Math.random() * 100) + 40,
      })),
      energyDistribution: [
        { energy: 'Low (0-0.33)', count: 412 },
        { energy: 'Medium (0.33-0.67)', count: 1823 },
        { energy: 'High (0.67-1.0)', count: 2288 },
      ],
      moodTrends: Array.from({ length: 13 }, (_, i) => ({
        week: i + 1,
        mood: 'happy',
        score: Math.floor(Math.random() * 40) + 50,
      })),
      predictionNextQuarter: {
        topGenres: ['Rock', 'Indie', 'Electronic'],
        topArtists: ['The Weeknd', 'Arctic Monkeys', 'Tyler, The Creator'],
        likelyMood: 'energetic',
      },
      tasteEvolution: Array.from({ length: 12 }, (_, i) => ({
        date: `${i + 1}`,
        genreDistribution: {
          Rock: Math.floor(Math.random() * 30) + 20,
          Electronic: Math.floor(Math.random() * 25) + 15,
          Pop: Math.floor(Math.random() * 20) + 10,
        },
        averageEnergy: Math.random() * 0.3 + 0.5,
      })),
    };
    setStats(mockStats);
  };

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="personal-stats-v2">
      <header className="stats-header">
        <h1>Your Music Statistics</h1>
        <div className="controls">
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as any)}>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="year">Last year</option>
            <option value="all">All time</option>
          </select>
          <label>
            Recent Weight: <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={decayFactor}
              onChange={(e) => setDecayFactor(parseFloat(e.target.value))}
            />
            {Math.round(decayFactor * 100)}%
          </label>
        </div>
      </header>

      {/* TABS */}
      <div className="tabs">
        {(['overview', 'trends', 'predictions', 'evolution'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="content">
          <div className="summary-cards">
            <div className="card">
              <h3>Total Listens</h3>
              <p className="big-number">{stats.totalListens}</p>
              <span className="unit">songs played</span>
            </div>
            <div className="card">
              <h3>Total Minutes</h3>
              <p className="big-number">{Math.round(stats.totalMinutes / 60)}</p>
              <span className="unit">hours listened</span>
            </div>
            <div className="card">
              <h3>Unique Artists</h3>
              <p className="big-number">{stats.uniqueArtists}</p>
              <span className="unit">different artists</span>
            </div>
            <div className="card">
              <h3>Unique Songs</h3>
              <p className="big-number">{stats.uniqueSongs}</p>
              <span className="unit">different songs</span>
            </div>
          </div>

          <div className="charts-grid-2">
            {/* TOP GENRES */}
            <div className="chart-container">
              <h3>Top Genres</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.topGenres}
                    dataKey="count"
                    nameKey="genre"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {stats.topGenres.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* LISTENING BY DAY */}
            <div className="chart-container">
              <h3>Listening by Day</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.listeningByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="listens" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* TOP ARTISTS */}
          <div className="top-artists">
            <h3>Top Artists</h3>
            <div className="artist-list">
              {stats.topArtists.map((artist, index) => (
                <div key={index} className="artist-item">
                  <span className="rank">#{index + 1}</span>
                  <span className="name">{artist.artist}</span>
                  <span className="count">{artist.count} plays</span>
                </div>
              ))}
            </div>
          </div>

          {/* ENERGY DISTRIBUTION */}
          <div className="chart-full-width">
            <h3>Energy Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.energyDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="energy" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === 'trends' && (
        <div className="content">
          <h3>13-Week Mood Trend</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={stats.moodTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" label={{ value: 'Week', position: 'insideBottomRight', offset: -10 }} />
              <YAxis label={{ value: 'Happiness Score', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#8884d8"
                dot={{ fill: '#8884d8', r: 4 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* PREDICTIONS TAB */}
      {activeTab === 'predictions' && (
        <div className="content">
          <div className="prediction-cards">
            <div className="card">
              <h3>Predicted Top Genre (Q2)</h3>
              <p className="big-number">{stats.predictionNextQuarter.topGenres[0]}</p>
            </div>
            <div className="card">
              <h3>Predicted Top Artist (Q2)</h3>
              <p className="big-number">{stats.predictionNextQuarter.topArtists[0]}</p>
            </div>
            <div className="card">
              <h3>Predicted Mood (Q2)</h3>
              <p className="big-number">{stats.predictionNextQuarter.likelyMood}</p>
            </div>
          </div>
        </div>
      )}

      {/* EVOLUTION TAB */}
      {activeTab === 'evolution' && (
        <div className="content">
          <h3>Taste Evolution Over Time</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={stats.tasteEvolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" label={{ value: 'Month', position: 'insideBottomRight', offset: -10 }} />
              <YAxis label={{ value: 'Genre %', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="genreDistribution.Rock" fill="#8884d8" name="Rock" />
              <Bar dataKey="genreDistribution.Electronic" fill="#82ca9d" name="Electronic" />
              <Bar dataKey="genreDistribution.Pop" fill="#ffc658" name="Pop" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <style>{`
        .personal-stats-v2 {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .controls {
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tab {
          padding: 10px 20px;
          border: none;
          background: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: all 0.3s;
        }

        .tab.active {
          color: white;
          border-bottom: 2px solid #1db954;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .card {
          background: rgba(255, 255, 255, 0.05);
          padding: 20px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .big-number {
          font-size: 32px;
          font-weight: bold;
          margin: 10px 0;
        }

        .charts-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        .chart-container {
          background: rgba(255, 255, 255, 0.05);
          padding: 20px;
          border-radius: 8px;
        }

        .chart-full-width {
          background: rgba(255, 255, 255, 0.05);
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .top-artists {
          background: rgba(255, 255, 255, 0.05);
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .artist-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .artist-item {
          display: grid;
          grid-template-columns: 40px 1fr 1fr;
          gap: 15px;
          align-items: center;
          padding: 10px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }

        .rank {
          font-weight: bold;
          color: #1db954;
        }

        @media (max-width: 768px) {
          .charts-grid-2 {
            grid-template-columns: 1fr;
          }

          .summary-cards {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
};

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];
