import React, { useState, useEffect, useContext } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { userContext } from "../App";
import AuthContextStore from "../store/AuthContextStore";
import { PageLoader } from "../components/layout/page-loader";
//import Accounts from "../components/layout/accounts";
import { WalletViewsClient } from "@synfini/wallet-views";
import { PageLayout } from "../components/PageLayout";
import { AccountSummary } from "@daml.js/synfini-wallet-views-types/lib/Synfini/Wallet/Api/Types";
import Funds from "../components/layout/funds";
import { Template } from "@daml/types";

const MainScreen: React.FC = () => {
  const { user, isAuthenticated } = useAuth0();
  const walletViewsBaseUrl = `${window.location.protocol}//${window.location.host}/wallet-views`;
  const ctx = useContext(AuthContextStore);
  const ledger = userContext.useLedger();

  const { isLoading } = useAuth0();
  const [primaryParty, setPrimaryParty] = useState<string>("");
  const [funds, setFunds] = useState<any[]>();

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

  const fetchFunds = async () => {
    if (primaryParty !== "") {
      const resp = await walletClient.getAccounts({ owner: primaryParty });
      setFunds(resp.accounts);
      // type Foo = { key: string };
      // const Foo: Template<Foo, string, "foo-id"> = {
      //   sdkVersion: "0.0.0-SDKVERSION",
      //   templateId: "foo-id",
      //   keyDecoder: jtv.string(),
      //   keyEncode: (s: string): unknown => s,
      //   decoder: jtv.object({ key: jtv.string() }),
      //   encode: o => o,
      //   // eslint-disable-next-line @typescript-eslint/ban-types
      //   Archive: {} as unknown as Choice<Foo, {}, {}, string>,
      // };

      // const funds = ledger.streamQueries(Foo, null);
      // setFunds(funds);
    }
  };

  useEffect(() => {
    fetchUserLedger();
  }, []);

  useEffect(() => {
    fetchFunds();
  }, [primaryParty]);


  console.log("funds",funds)



  if (isLoading) {
    return (
      <div>
        <PageLoader />
      </div>
    );
  }

  return (
    <PageLayout>
      <div>
        {/* <Funds funds={funds} /> */}
      </div>

    </PageLayout>
  );
};

export default MainScreen;
