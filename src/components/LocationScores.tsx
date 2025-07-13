import React from 'react';
import { MapPin, Users, Car, Bike, AlertCircle } from 'lucide-react';

interface LocationScoresProps {
  locationAnalysis?: {
    walkScore: number;
    bikeScore: number;
    transitScore: number;
    safetySentiment: string;
  };
}

const ScoreBar = ({ score, label, icon, color }: { score: number; label: string; icon: React.ReactNode; color: string }) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreText = (score: number) => {
    if (score >= 70) return 'Excellent';
    if (score >= 50) return 'Good';
    return 'Limited';
  };

  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-[100px]">
        <span className={`text-sm ${color}`}>{icon}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
        <div 
          className={`${getScoreColor(score)} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="min-w-[60px] text-right">
        <span className="text-sm font-semibold text-gray-800">{score}</span>
        <span className="text-xs text-gray-500 ml-1">{getScoreText(score)}</span>
      </div>
    </div>
  );
};

export default function LocationScores({ locationAnalysis }: LocationScoresProps) {
  if (!locationAnalysis) {
    return null;
  }

  const { walkScore, bikeScore, transitScore, safetySentiment } = locationAnalysis;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Location Scores</h3>
      </div>

      <div className="space-y-1">
        <ScoreBar 
          score={walkScore} 
          label="Walk" 
          icon={<Users className="w-4 h-4" />}
          color="text-green-600"
        />
        <ScoreBar 
          score={bikeScore} 
          label="Bike" 
          icon={<Bike className="w-4 h-4" />}
          color="text-blue-600"
        />
        <ScoreBar 
          score={transitScore} 
          label="Transit" 
          icon={<Car className="w-4 h-4" />}
          color="text-purple-600"
        />
      </div>

      {safetySentiment && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-1">Safety & Neighborhood</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{safetySentiment}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 