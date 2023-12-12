import React from 'react';

interface CreateButtonProps {
  walletMode: string; 
}

const CreateAssetButton: React.FC<CreateButtonProps> = ({ walletMode }) => {
  if (walletMode === 'issuer') {
    return (
      <button type="button" className="button__login" style={{ width: "150px" }}>
        Create Instrument
      </button>
    );
  } else if (walletMode === 'fund') {
    return (
      <button type="button" className="button__login" style={{ width: "150px" }}>
        Create Fund
      </button>
    );
  }

  return null;
};

export default CreateAssetButton;
