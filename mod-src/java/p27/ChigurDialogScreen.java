package com.example.zitraksmode.client;
import com.example.zitraksmode.network.*;
import com.example.zitraksmode.network.chigur.ChigurDialogChoicePacket;
import com.example.zitraksmode.network.chigur.ChigurNetwork;

import net.minecraft.client.gui.components.Button; import net.minecraft.client.gui.screens.Screen; import net.minecraft.network.chat.Component;
public class ChigurDialogScreen extends Screen {private final int id;public ChigurDialogScreen(int id){super(Component.literal("Антон Чигур"));this.id=id;}protected void init(){addRenderableWidget(new Button(width/2-90,height/2-35,180,20,Component.literal("Откуда ты?"),b->choose(0)));addRenderableWidget(new Button(width/2-90,height/2-10,180,20,Component.literal("..."),b->choose(1)));addRenderableWidget(new Button(width/2-90,height/2+15,180,20,Component.literal("Извините, обознался"),b->choose(2)));}private void choose(int c){ChigurNetwork.CHANNEL.sendToServer(new ChigurDialogChoicePacket(id,c));onClose();}}
