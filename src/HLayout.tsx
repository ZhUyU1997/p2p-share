import React from "react";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
const HLayout = React.forwardRef<HTMLDivElement, Props>(
  ({ style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export default HLayout;
