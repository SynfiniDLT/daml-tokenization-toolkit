import { ProposalContainer, ButtonContainer } from "./general.styled";

export default function GiverProposal(props: { giver?: any[] }) {
  return (
    <ProposalContainer>
      <>
        <h5>Asset description</h5>
        <span>Value: </span>{" "}
        <span>XXXXXXXXXXXXXXX XXXXXXXXXXXX XXXXXXXXXXXX </span> <br />
        <span>Value:</span> <br />
        <span>Value:</span> <br />
        <span>Value:</span> <br />
        <span>Value:</span> <br />
        <span>Value:</span> <br />
        <ButtonContainer>
          {/* <button
            type="button"
            className="button__login"
            onClick={() => alert("accept")}
          >
            Accept Proposal
          </button> */}

          {/* <button
            type="button"
            className="button__login"
            onClick={() => alert("edit")}
          >
            Edit Proposal
          </button> */}
        </ButtonContainer>
      </>
    </ProposalContainer>
  );
}
