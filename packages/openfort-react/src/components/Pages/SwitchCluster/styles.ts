import styled from '../../../styles/styled'

export const ClusterList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
`

export const ClusterOption = styled.button<{ $active?: boolean }>`
  appearance: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: none;
  font-size: 15px;
  font-weight: 500;
  text-align: left;
  color: var(--ck-body-color);
  background: ${(p) => (p.$active ? 'var(--ck-dropdown-active-background, rgba(26, 136, 248, 0.1))' : 'transparent')};
  transition: background 100ms ease;

  &:hover {
    background: var(--ck-body-background-secondary, rgba(0, 0, 0, 0.03));
  }
  &:focus-visible {
    outline: 2px solid var(--ck-focus-color);
  }
`

export const ClusterOptionName = styled.span``

export const ClusterOptionCheck = styled.span`
  color: var(--ck-dropdown-active-color, var(--ck-accent-color));
  font-size: 14px;
`

export const MainnetConfirm = styled.div`
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--ck-body-background-secondary);
  font-size: 14px;
  color: var(--ck-body-color);
`

export const MainnetConfirmActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`
