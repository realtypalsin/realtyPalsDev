'use client';

import React from 'react';
import { motion as m } from 'framer-motion';
import {
  Building2,
  Crown,
  Train,
  Wallet,
  TrendingUp,
  Home,
  Key,
  BarChart3,
  Sofa,
  Shield,
  Zap,
  Trees,
  Activity,
  Wind,
  ShoppingCart,
  Sparkles
} from 'lucide-react';
import { HOME_BUTTONS, getSectorButtonGroups } from '@/lib/homeButtons';

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 size={14} />,
  Crown: <Crown size={14} />,
  Train: <Train size={14} />,
  Wallet: <Wallet size={14} />,
  TrendingUp: <TrendingUp size={14} />,
  Home: <Home size={14} />,
  Key: <Key size={14} />,
  BarChart3: <BarChart3 size={14} />,
  Sofa: <Sofa size={14} />,
  Shield: <Shield size={14} />,
  Zap: <Zap size={14} />,
  Trees: <Trees size={14} />,
  Activity: <Activity size={14} />,
  Wind: <Wind size={14} />,
  ShoppingCart: <ShoppingCart size={14} />,
  Sparkles: <Sparkles size={14} />
};

interface HomeButtonsProps {
  onButtonClick: (prompt: string) => void;
}

export default function HomeButtons({ onButtonClick }: HomeButtonsProps) {
  const sectorGroups = getSectorButtonGroups();

  return (
    <div className="w-full space-y-6">
      {sectorGroups.map((group) => (
        <div key={group.sector}>
          <h3 className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-3 px-1">
            Sector {group.sector}
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {group.buttons.map((button, idx) => (
              <m.button
                key={`${group.sector}-${idx}`}
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                onClick={() => onButtonClick(button.prompt)}
                className="group flex items-center gap-2 px-3.5 py-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap border border-gray-200 dark:border-gray-700"
              >
                <span className="flex-shrink-0 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-blue-500 transition-colors">
                  {iconMap[button.icon]}
                </span>
                <span>{button.label}</span>
              </m.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
