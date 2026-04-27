import Svg, { Circle, Path, Rect } from "react-native-svg";

import { joumlaColors } from "@/lib/app-shell";

type JoumlaSymbolProps = {
  size?: number;
};

export function JoumlaSymbol({ size = 88 }: JoumlaSymbolProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <Path
        d="M18 24H30L36 58H74"
        stroke={joumlaColors.navy}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M31 30H77L71 52H36"
        stroke={joumlaColors.navy}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="42" cy="71" r="5.5" fill={joumlaColors.navy} />
      <Circle cx="69" cy="71" r="5.5" fill={joumlaColors.navy} />
      <Rect x="40" y="34" width="12" height="11" rx="2" fill={joumlaColors.pink} />
      <Rect x="53" y="26" width="14" height="19" rx="2" fill={joumlaColors.pink} />
      <Rect x="56" y="23" width="4" height="6" rx="1" fill={joumlaColors.navy} />
      <Rect x="39" y="31" width="4" height="5" rx="1" fill={joumlaColors.navy} />
      <Rect x="60" y="31" width="4" height="5" rx="1" fill={joumlaColors.navy} />
      <Rect x="54" y="46" width="11" height="7" rx="1.5" fill={joumlaColors.pink} />
      <Path
        d="M64 40C71 40 75 38 82 31"
        stroke={joumlaColors.pink}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Path d="M82 31L76 31L82 24L83 31L82 31Z" fill={joumlaColors.pink} />
      <Path d="M43 27L57 18L71 27" stroke={joumlaColors.navy} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="52" y="20.5" width="3.5" height="4.5" rx="1" fill={joumlaColors.navy} />
      <Rect x="57" y="20.5" width="3.5" height="4.5" rx="1" fill={joumlaColors.navy} />
    </Svg>
  );
}
