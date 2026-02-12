import { PageContent } from '../PageContent'

/** Props for {@link PageLayout}. */
export type PageLayoutProps = {
  children?: React.ReactNode
  width?: number | string
  header?: string
}

/**
 * Page layout with optional header and configurable width. Use for modal pages.
 *
 * @example
 * ```tsx
 * <PageLayout header="Connect" width={400}>
 *   <ConnectForm />
 * </PageLayout>
 * ```
 */
export const PageLayout = ({ children, width, header }: PageLayoutProps) => {
  return (
    <PageContent width={width} header={header} onBack={null}>
      {children}
    </PageContent>
  )
}
