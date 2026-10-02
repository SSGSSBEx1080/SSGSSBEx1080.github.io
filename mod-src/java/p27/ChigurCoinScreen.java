package com.example.zitraksmode.client;
import com.example.zitraksmode.network.*;
import com.example.zitraksmode.network.chigur.ChigurCoinChoicePacket;
import com.example.zitraksmode.network.chigur.ChigurNetwork;

import net.minecraft.client.gui.components.Button; import net.minecraft.client.gui.screens.Screen; import net.minecraft.network.chat.Component;
public class ChigurCoinScreen extends Screen {private final int id;public ChigurCoinScreen(int id){super(Component.literal("Монетка"));this.id=id;}protected void init(){addRenderableWidget(new Button(width/2-92,height/2,88,20,Component.literal("Орёл"),b->pick(true)));addRenderableWidget(new Button(width/2+4,height/2,88,20,Component.literal("Решка"),b->pick(false)));}private void pick(boolean h){ChigurNetwork.CHANNEL.sendToServer(new ChigurCoinChoicePacket(id,h));onClose();}}
