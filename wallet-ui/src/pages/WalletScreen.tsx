import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLoader } from "../components/layout/page-loader";
import Accounts from "../components/layout/accounts";
import { WalletViewsClient } from "@synfini/wallet-views";
import { PageLayout } from "../components/PageLayout";
import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import Modal from "react-modal";
import styled from "styled-components";

const WalletScreen: React.FC = () => {
  const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}/wallet-views`;
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const { isLoading } = useAuth0();
  const [primaryParty, setPrimaryParty] = useState<string>("");
  const [accounts, setAccounts] = useState<AccountSummary[]>();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  let walletClient: WalletViewsClient;

  walletClient = new WalletViewsClient({
    baseUrl: walletViewsBaseUrl,
    token: ctx.token,
  });

  const fetchUserLedger = async () => {
    try {
      const user = await ledger.getUser();
      const rights = await ledger.listUserRights();
      const found = rights.find(
        (right) =>
          right.type === "CanActAs" && right.party === user.primaryParty
      );
      ctx.readOnly = found === undefined;

      if (user.primaryParty !== undefined) {
        setPrimaryParty(user.primaryParty);
        ctx.setPrimaryParty(user.primaryParty);
      } else {
      }
    } catch (err) {
      console.log("error when fetching primary party", err);
    }
  };

  const fetchAccounts = async () => {
    if (primaryParty !== "") {
      const resp = await walletClient.getAccounts({ owner: primaryParty });
      setAccounts(resp.accounts);
    }
  };

  useEffect(() => {
    fetchUserLedger();
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [primaryParty]);


  const InfoContainer = styled.h2`
    display: flex;
    justify-content: center;
    text-align: center;
    color: #000;
  `;

  const Info = styled.span`
    display: flex;
    flex-direction: column;
    font-size: 1.5rem;
    row-gap: 0.5rem;
    justify-content: left;
  `;

  const FieldCardModal = styled.div`
    color: #ffffff;
    text-align: left;
    margin-bottom: 0rem;
    font-weight: normal;
    font-size: 15px;
    padding: 10px;
  `;

  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }
  console.log(ctx.token)
  return (
    <PageLayout>
      <h3 className="profile__title" style={{ marginTop: "10px" }}></h3>
      <div>
        <Accounts accounts={accounts} />
      </div>
      
    </PageLayout>
  );
};

export default WalletScreen;
