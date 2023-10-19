import React from "react";
import { PageLayout } from "../components/PageLayout";
import styled from "styled-components";
import GiverProposal from "../components/layout/giverProposal";
import TakerProposal from "../components/layout/takerProposal";

const PeerToPeerScreen: React.FC = () => {
  const WrapperContainer = styled.div`
    display: flex;
    flex-direction: row;
  `;

  const PageContainerWapper = styled.div`
    padding: 5px;
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  `;

  return (
    <PageLayout>
      <div style={{ marginTop: "15px" }}>
        <h4 className="profile__title">Peer to Peer transfer</h4>
      </div>
      <WrapperContainer>
        <PageContainerWapper>
          <div style={{ marginTop: "15px" }}>
            <h4 className="profile__title">Giver proposal</h4>
            <GiverProposal />
            <GiverProposal />
            <GiverProposal />
          </div>
        </PageContainerWapper>
        <PageContainerWapper>
          <div style={{ marginTop: "15px" }}>
            <h4 className="profile__title">Taker proposal</h4>
            <TakerProposal />
          </div>
        </PageContainerWapper>
      </WrapperContainer>
    </PageLayout>
  );
};

export default PeerToPeerScreen;
