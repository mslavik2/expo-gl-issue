import React, { useRef, useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";

import Signature from "./Signature";
import { TouchableNativeFeedback } from "react-native-gesture-handler";

export default () => {
  const signatureRef = useRef(null);

  const clear = useCallback(() => {
    signatureRef.current.clearSignature();
  }, [signatureRef.current]);

  const undo = useCallback(() => {
    signatureRef.current.undo();
  }, [signatureRef.current]);

  const redraw = useCallback(() => {
    signatureRef.current.redraw();
  }, [signatureRef.current]);

  const redrawAll = useCallback(() => {
    signatureRef.current.redrawAll();
  }, [signatureRef.current]);
  return (
    <View style={styles.container}>
      <View style={{ borderColor: "black", borderWidth: 2 }}>
        <Signature
          ref={signatureRef}
          style={{ flex: 1, height: "100%" }}
          strokeColor={"blue"}
          strokeAlpha={1}
          onReady={() => console.log("ready")}
        />
      </View>
      <TouchableNativeFeedback onPress={clear}>
        <Text>Clear</Text>
      </TouchableNativeFeedback>
      <TouchableNativeFeedback onPress={undo}>
        <Text>Undo</Text>
      </TouchableNativeFeedback>
      <TouchableNativeFeedback onPress={redraw}>
        <Text>Redraw last segment</Text>
      </TouchableNativeFeedback>
      <TouchableNativeFeedback onPress={redrawAll}>
        <Text>Redraw all</Text>
      </TouchableNativeFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "100%",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center"
  }
});
