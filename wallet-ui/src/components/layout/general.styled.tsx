import styled from "styled-components";

export const ProposalContainer = styled.div`
  background-color: #696975;
  padding: 5px;
  margin: 5px;
  box-shadow: 1px 2px 2px hsl(0deg 0% 0% / 0.22);
  border-radius: 5px;
  width: 90%;
  height: 240px;
`;

export const ButtonContainer = styled.div`
  padding-top: 10px;
  flex: 1;
  display: flex;
  column-gap: 1rem;
  height: 40px;
`;

interface CardContainerProps {
  pointer?: boolean;
}

export const CardContainer = styled.div<CardContainerProps>`
  border-radius: 12px;
  margin: 15px;
  padding: 10px;
  cursor: ${(props) => (props.pointer ? 'pointer' : 'default')};
  background-color: #2a2b2f;
  box-shadow: inset 0 0 0.5px 1px hsla(0, 0%, 100%, 0.075),
    0 0 0 1px hsla(0, 0%, 0%, 0.05), 0 0.3px 0.4px hsla(0, 0%, 0%, 0.02),
    0 0.9px 1.5px hsla(0, 0%, 0%, 0.045), 0 3.5px 6px hsla(0, 0%, 0%, 0.09);
`;

export const ContainerDiv = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 300px; /* Adjust the width as needed */
`;

export const ContainerColumn = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 150px;
`;

export const ContainerColumnKey = styled.p`
  margin-bottom: 5px;
  padding: 5px;
`;

export const ContainerColumnField = styled.div`
  margin: 5px;
  padding: 5px;
  height: 2em;
  vertical-align: middle;
`;

export const ContainerColumnAutoField = styled.div`
  margin: 5px;
  padding: 5px;
  height: auto;
  vertical-align: middle;
`;

export const ContainerColumnValue = styled.p`
  margin-bottom: 5px;
  padding: 5px;
  justify-content: space-between;
  margin-left: 10px;
  white-space: nowrap;
`;

export const KeyValuePair = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end; /* Align content to the bottom */
  margin: 5px;
  padding: 5px;
`;

export const ValueColumn = styled.div`
  text-align: left; /* Align text to the left for values */
`;

export const KeyColumn = styled.div`
  text-align: right; /* Align text to the right for keys */
`;

export const DivBorderRoundContainer = styled.div`
  border: 2px solid white;
  border-radius: 10px;
  width: 90%;
  margin: 10px;
`;

export const Field = styled.span`
  padding: 10px;
  font-weight: 700;
`;

export const FieldSettled = styled.span`
  color: green;
`;

export const FieldPending = styled.span`
  color: yellow;
`;