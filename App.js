import React, { useRef, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";

import Signature from "./Signature";

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
      <TouchableOpacity onPress={clear}>
        <Text>Clear</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={undo}>
        <Text>Undo</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={redraw}>
        <Text>Redraw last segment</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={redrawAll}>
        <Text>Redraw all</Text>
      </TouchableOpacity>
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
