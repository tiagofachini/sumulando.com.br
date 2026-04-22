import React from 'react';
import { motion } from 'framer-motion';

const AdSpace = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-8"
    >
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 border-2 border-dashed border-gray-300 text-center min-h-[600px] flex flex-col items-center justify-center">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto flex items-center justify-center">
            <span className="text-3xl">📢</span>
          </div>
          <h3 className="text-xl font-bold text-gray-600">
            Espaço Publicitário
          </h3>
          <p className="text-gray-500 text-sm">
            300x600 pixels
          </p>
          <p className="text-gray-400 text-xs max-w-xs">
            Este espaço está disponível para anúncios e parcerias
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default AdSpace;