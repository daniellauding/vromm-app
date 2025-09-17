-- Add missing virtual preset translations
INSERT INTO translations (key, value, language, platform) VALUES
('mapPresets.virtualPreset', 'Virtual Preset', 'en', 'mobile'),
('mapPresets.virtualPresetMessage', 'This is a virtual preset that shows all routes. You cannot add or remove routes from it.', 'en', 'mobile'),
('mapPresets.virtualPreset', 'Virtuell Förinställning', 'sv', 'mobile'),
('mapPresets.virtualPresetMessage', 'Detta är en virtuell förinställning som visar alla rutter. Du kan inte lägga till eller ta bort rutter från den.', 'sv', 'mobile')

ON CONFLICT (key, language, platform) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
