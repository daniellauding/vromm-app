export default function VisibilityGuard(Comp: React.ComponentType<any>) {
  return (props: any) => {
    const { visible } = props;
    if (!visible) return null;

    return <Comp {...props} />;
  };
}
