import { useEffect, useState } from "react";
import leftHand from "./assets/left hand (1).png";
import rightHand from "./assets/right hand.png";
import sMark from "./assets/s (1).png";
import wordWithoutS from "./assets/long logo without s.png";

function BrandIntro() {
  const [visible, setVisible] = useState(() => {
    return sessionStorage.getItem("svmbIntroSeenV6") !== "true";
  });

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const timer = setTimeout(() => {
      sessionStorage.setItem("svmbIntroSeenV6", "true");
      setVisible(false);
    }, 5900);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="brand-intro" aria-label="SVMB brand intro">
      <div className="brand-intro-stage brand-final-composition-stage">
        <img
          src={leftHand}
          alt=""
          className="brand-final-layer brand-final-left"
          aria-hidden="true"
        />
        <img
          src={rightHand}
          alt=""
          className="brand-final-layer brand-final-right"
          aria-hidden="true"
        />
        <img
          src={sMark}
          alt=""
          className="brand-final-layer brand-final-s"
          aria-hidden="true"
        />
        <img
          src={wordWithoutS}
          alt="Svmb"
          className="brand-final-layer brand-final-word"
        />
      </div>
    </div>
  );
}

export default BrandIntro;

